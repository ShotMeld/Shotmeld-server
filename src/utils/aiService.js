const OpenAI = require('openai');
const config = require('../config/config');

/**
 * 创建OpenAI客户端
 */
function createOpenAIClient() {
    return new OpenAI({
        apiKey: config.ai.dashscopeApiKey,
        baseURL: config.ai.baseURL
    });
}

/**
 * 使用AI进行语义标签匹配
 * @param {string} searchQuery - 用户搜索内容
 * @param {Array} allTags - 所有可用标签列表
 * @returns {Promise<Array>} - 匹配的标签列表
 */
async function semanticTagMatching(searchQuery, allTags) {
    try {
        if (!config.ai.dashscopeApiKey) {
            console.warn('DASHSCOPE_API_KEY 未配置，跳过AI语义匹配');
            return [];
        }

        if (!allTags || allTags.length === 0) {
            return [];
        }

        const client = createOpenAIClient();
        
        // 构造提示词
        const prompt = `你是一个智能标签匹配助手。你的任务是根据用户提供的搜索内容，从给定的 JSON 标签文件中匹配与搜索内容相关的标签，并以 JSON 格式返回匹配结果。

以下是所有标签的 JSON 文件：
${JSON.stringify({ tags: allTags }, null, 2)}

用户的搜索内容是：${searchQuery}

请匹配出与搜索内容相关的标签，并以 JSON 格式返回，仅包含匹配的标签列表。返回格式示例：
{
  "matched_tags": ["tag1", "tag2"]
}

注意：
1. 请进行语义分析，不仅仅是字面匹配
2. 考虑同义词、相关概念和上下文关联
3. 返回结果必须是有效的JSON格式
4. 如果没有相关标签，请返回空数组
5. 不要添加任何解释，只返回JSON结果`;

        const completion = await client.chat.completions.create({
            model: config.ai.model,
            messages: [
                { role: "system", content: "You are a helpful assistant that only responds with valid JSON." },
                { role: "user", content: prompt }
            ],
            temperature: 0.3, // 降低温度以获得更一致的结果
        });

        const responseContent = completion.choices[0].message.content.trim();

        // 尝试解析JSON响应
        try {
            const parsedResponse = JSON.parse(responseContent);
            
            if (parsedResponse.matched_tags && Array.isArray(parsedResponse.matched_tags)) {
                const validMatchedTags = parsedResponse.matched_tags.filter(tag => 
                    allTags.includes(tag)
                );
                
                return validMatchedTags;
            }
            
            return [];
        } catch (parseError) {
            console.error('解析AI响应JSON失败:', parseError);
            console.error('响应内容:', responseContent);
            
            // 尝试从响应中提取标签，即使JSON格式不完整
            const tagMatches = responseContent.match(/"([^"]+)"/g);
            if (tagMatches) {
                const extractedTags = tagMatches
                    .map(match => match.replace(/"/g, ''))
                    .filter(tag => allTags.includes(tag));
                return extractedTags;
            }
            
            return [];
        }
    } catch (error) {
        console.error('AI语义标签匹配失败:', error);
        return [];
    }
}

module.exports = {
    createOpenAIClient,
    semanticTagMatching
};
