import { Hono } from 'hono';
import { success, error } from '../utils/response';
import type { Env } from '../types';

type Variables = { user: import('../types').JwtPayload };

export const aiRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ========== 虫害图像识别 ==========
aiRoutes.post('/identify-pest', async (c) => {
  const body = await c.req.json<{ imageUrl: string }>();

  if (!body.imageUrl) {
    return c.json(error('请提供虫体图片URL'), 400);
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${c.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `你是一个农业害虫识别专家。请分析这张虫体照片，识别害虫种类并估计数量。
优先匹配以下害虫：稻纵卷叶螟、白背飞虱、大螟、二化螟、玉米螟、草地贪夜蛾。
请严格按以下JSON格式返回，不要包含其他文字：
{
  "species": "害虫中文名",
  "latin_name": "拉丁学名",
  "count": 数量(整数),
  "confidence": 置信度(0-100的整数),
  "category": "一类/二类/其他",
  "description": "简要描述识别依据"
}`,
                },
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: body.imageUrl, // 如果是base64
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 512,
          },
        }),
      }
    );

    const data = await response.json() as Record<string, unknown>;
    const candidates = data.candidates as Array<{ content: { parts: Array<{ text: string }> } }> | undefined;
    const text = candidates?.[0]?.content?.parts?.[0]?.text || '';

    // 提取JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return c.json(error('AI识别结果解析失败'), 500);
    }

    const result = JSON.parse(jsonMatch[0]);
    return c.json(success(result));
  } catch (err) {
    console.error('AI识别失败:', err);
    return c.json(error('AI识别服务异常'), 500);
  }
});

// ========== 农事智能问答 ==========
aiRoutes.post('/chat', async (c) => {
  const body = await c.req.json<{ message: string; context?: string }>();

  if (!body.message) {
    return c.json(error('请输入问题'), 400);
  }

  try {
    // 先从向量库检索相关知识（VECTORIZE未绑定时跳过）
    let context = '';
    if (c.env.VECTORIZE) {
      try {
        const vectorResults = await c.env.VECTORIZE.query(body.message as unknown as number[], { topK: 5 });
        if (vectorResults?.matches?.length) {
          context = vectorResults.matches
            .map((m: { metadata?: Record<string, unknown> }) => m.metadata?.text as string || '')
            .filter(Boolean)
            .join('\n---\n');
        }
      } catch {
        // 向量检索失败时继续，不阻断
      }
    }

    const systemPrompt = `你是一个农业专家助手，专门服务于农业制种基地监测平台。
你的知识涵盖：气象与农业、土壤墒情管理、病虫害防治、作物种植管理、农机使用指导等。
请用专业但通俗易懂的语言回答用户问题。如果涉及具体数据，请结合监测数据给出建议。
${context ? `\n以下是从知识库检索到的相关信息，可作为参考：\n${context}` : ''}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${c.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: body.message }] },
          ],
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    const data = await response.json() as Record<string, unknown>;
    const candidates = data.candidates as Array<{ content: { parts: Array<{ text: string }> } }> | undefined;
    const text = candidates?.[0]?.content?.parts?.[0]?.text || '抱歉，暂时无法回答您的问题。';

    return c.json(success({ reply: text }));
  } catch (err) {
    console.error('AI问答失败:', err);
    return c.json(error('AI服务异常'), 500);
  }
});

// ========== 智能分析报告 ==========
aiRoutes.post('/report', async (c) => {
  const body = await c.req.json<{
    type: 'weather' | 'pest' | 'comprehensive';
    data: Record<string, unknown>;
    period?: string;
  }>();

  if (!body.type || !body.data) {
    return c.json(error('请提供分析类型和数据'), 400);
  }

  try {
    const prompts: Record<string, string> = {
      weather: `请根据以下气象监测数据，生成一份农业气象分析报告。分析要点：
1. 气温变化趋势及对作物的影响
2. 降水情况及灌溉建议
3. 风力风速对田间作业的影响
4. 光照条件评估
5. 积温积光是否满足作物需求
6. 未来农事操作建议`,
      pest: `请根据以下虫情监测数据，生成一份虫害分析报告。分析要点：
1. 主要害虫种类及发生趋势
2. 虫害爆发高峰期判断
3. 防控时机建议
4. 推荐防治措施和用药方案
5. 后续监测重点`,
      comprehensive: `请根据以下监测数据，生成一份综合性农情分析报告。涵盖气象、虫情、作物长势等维度，给出全周期种植管理建议。`,
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${c.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `${prompts[body.type]}\n\n监测数据（${body.period || '近期'}）：\n${JSON.stringify(body.data, null, 2)}\n\n请用Markdown格式输出报告。`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    const data = await response.json() as Record<string, unknown>;
    const candidates = data.candidates as Array<{ content: { parts: Array<{ text: string }> } }> | undefined;
    const text = candidates?.[0]?.content?.parts?.[0]?.text || '';

    return c.json(success({ report: text }));
  } catch (err) {
    console.error('报告生成失败:', err);
    return c.json(error('报告生成服务异常'), 500);
  }
});
