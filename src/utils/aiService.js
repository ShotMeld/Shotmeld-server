const OpenAI = require('openai');
const config = require('../config/config');

// 是否为开发环境
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';

/**
 * 开发环境调试日志
 */
function debugLog(...args) {
    if (isDevelopment) {
        console.log(...args);
    }
}

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
    const startTime = Date.now();
    debugLog(`[AI服务] 开始处理语义标签匹配请求 - 搜索内容: "${searchQuery}"`);
    debugLog(`[AI服务] 可用标签数量: ${allTags ? allTags.length : 0}`);

    try {
        if (!config.ai.dashscopeApiKey) {
            debugWarn('[AI服务] DASHSCOPE_API_KEY 未配置，跳过AI语义匹配');
            return [];
        }

        if (!allTags || allTags.length === 0) {
            debugWarn('[AI服务] 没有可用标签，跳过处理');
            return [];
        }

        const client = createOpenAIClient();
        
        // 构造提示词
        const prompt = `角色与目标 (Role & Goal):
你是一位专精于概念关联与语义理解的智能标签匹配引擎。你的核心任务是深入分析用户的搜索意图，并从一个给定的标签库中，广泛地匹配出所有相关的标签。

核心匹配原则 (Core Matching Principles):
你的匹配不应局限于字面上的同义词，而必须扩展到更广泛的语义关联维度：

相关性联想 (Associative Relevance): 匹配与搜索词在功能、场景或属性上紧密相关的事物。例如，搜索“学习”时，可以关联到“书籍”、“课程”、“考试”等标签。
场景化匹配 (Contextual Matching): 关键在于理解搜索词背后的场景和需求。举个关键例子：如果用户搜索“湖水”，你不仅要匹配“湖”，更需要智能地联想到相关的“河”、“江”、“溪”、“水”等，因为它们都属于“水体”这一核心概念。
输入信息 (Input Information):

所有标签的 JSON 文件如下：
${JSON.stringify({ tags: allTags }, null, 2)}

用户的搜索内容是：
${searchQuery}

输出要求 (Output Requirements):

请根据上述原则，匹配出与搜索内容相关的所有标签，并仅以 JSON 格式返回匹配的标签列表。

返回格式示例：
{ "matched_tags": ["tag1", "tag2"] }

严格遵守以下规则 (Strict Rules):

只返回 JSON：绝对不要添加任何解释、注释或额外的文字。
结果必须是有效的 JSON 数组。
若无相关标签：返回一个包含空数组的 JSON 对象，即 {"matched_tags": []}。`;

        debugLog(`[AI服务] 发送请求到OpenAI API - 模型: ${config.ai.model}`);
        const apiStartTime = Date.now();
        
        const completion = await client.chat.completions.create({
            model: config.ai.model,
            messages: [
                { role: "system", content: "You are a helpful assistant that only responds with valid JSON." },
                { role: "user", content: prompt }
            ],
            temperature: 0.3, // 降低温度以获得更一致的结果
        });

        const apiResponseTime = Date.now() - apiStartTime;
        debugLog(`[AI服务] OpenAI API响应时间: ${apiResponseTime}ms`);
        debugLog(`[AI服务] 原始响应内容:`, completion.choices[0].message.content.trim());

        const responseContent = completion.choices[0].message.content.trim();

        // 尝试解析JSON响应
        try {
            const parsedResponse = JSON.parse(responseContent);
            
            if (parsedResponse.matched_tags && Array.isArray(parsedResponse.matched_tags)) {
                const validMatchedTags = parsedResponse.matched_tags.filter(tag => 
                    allTags.includes(tag)
                );
                
                const totalTime = Date.now() - startTime;
                debugLog(`[AI服务] 处理成功 - 匹配到 ${validMatchedTags.length} 个标签`);
                debugLog(`[AI服务] 匹配的标签:`, validMatchedTags);
                debugLog(`[AI服务] 总处理时间: ${totalTime}ms`);
                
                return validMatchedTags;
            }
            
            debugLog('[AI服务] 未找到匹配的标签');
            return [];
        } catch (parseError) {
            debugError('[AI服务] 解析AI响应JSON失败:', parseError);
            debugError('[AI服务] 响应内容:', responseContent);
            
            // 尝试从响应中提取标签，即使JSON格式不完整
            const tagMatches = responseContent.match(/"([^"]+)"/g);
            if (tagMatches) {
                const extractedTags = tagMatches
                    .map(match => match.replace(/"/g, ''))
                    .filter(tag => allTags.includes(tag));
                
                debugLog('[AI服务] 通过备选方案提取标签成功 -', extractedTags);
                return extractedTags;
            }
            
            debugLog('[AI服务] 备选提取方案也失败，返回空数组');
            return [];
        }
    } catch (error) {
        const totalTime = Date.now() - startTime;
        // 错误信息在生产环境也需要记录，但使用console.error
        console.error(`[AI服务] 语义标签匹配失败 (${totalTime}ms):`, error);
        return [];
    }
}

module.exports = {
    createOpenAIClient,
    semanticTagMatching
};
