const path = require('path');
const { render_md } = require('../utils/render-md');

const DEFAULT_MODEL = 'glm-4.7-flash';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

/**
 * Convert Anthropic-style tool definitions to OpenAI format (used by Ollama)
 */
function convertToolsToOpenAI(tools) {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }));
}

/**
 * Convert Anthropic-style messages to OpenAI format
 */
function convertMessagesToOpenAI(messages, systemPrompt) {
  const result = [{ role: 'system', content: systemPrompt }];

  for (const msg of messages) {
    if (msg.role === 'user') {
      // Handle tool results
      if (Array.isArray(msg.content)) {
        for (const item of msg.content) {
          if (item.type === 'tool_result') {
            result.push({
              role: 'tool',
              tool_call_id: item.tool_use_id,
              content: item.content,
            });
          }
        }
      } else {
        result.push({ role: 'user', content: msg.content });
      }
    } else if (msg.role === 'assistant') {
      // Convert assistant messages with tool calls
      if (Array.isArray(msg.content)) {
        const textParts = msg.content.filter((b) => b.type === 'text').map((b) => b.text);
        const toolCalls = msg.content
          .filter((b) => b.type === 'tool_use')
          .map((b) => ({
            id: b.id,
            type: 'function',
            function: {
              name: b.name,
              arguments: JSON.stringify(b.input),
            },
          }));

        const assistantMsg = {
          role: 'assistant',
          content: textParts.join('\n') || null,
        };
        if (toolCalls.length > 0) {
          assistantMsg.tool_calls = toolCalls;
        }
        result.push(assistantMsg);
      } else {
        result.push({ role: 'assistant', content: msg.content });
      }
    }
  }

  return result;
}

/**
 * Convert OpenAI response to Anthropic format for consistency
 */
function convertResponseToAnthropic(openAIResponse) {
  const choice = openAIResponse.choices[0];
  const message = choice.message;
  const content = [];

  if (message.content) {
    content.push({ type: 'text', text: message.content });
  }

  if (message.tool_calls) {
    for (const toolCall of message.tool_calls) {
      content.push({
        type: 'tool_use',
        id: toolCall.id,
        name: toolCall.function.name,
        input: JSON.parse(toolCall.function.arguments || '{}'),
      });
    }
  }

  return {
    content,
    stop_reason: choice.finish_reason === 'tool_calls' ? 'tool_use' : 'end_turn',
  };
}

/**
 * Call Ollama API (OpenAI-compatible endpoint)
 */
async function callLLM(messages, tools) {
  const model = process.env.EVENT_HANDLER_MODEL || DEFAULT_MODEL;
  const systemPrompt = render_md(path.join(__dirname, '..', '..', 'operating_system', 'CHATBOT.md'));

  const openAIMessages = convertMessagesToOpenAI(messages, systemPrompt);
  const openAITools = convertToolsToOpenAI(tools);

  const body = {
    model,
    messages: openAIMessages,
    stream: false,
  };

  // Only include tools if there are any
  if (openAITools.length > 0) {
    body.tools = openAITools;
  }

  const response = await fetch(`${OLLAMA_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama API error: ${response.status} ${error}`);
  }

  const openAIResponse = await response.json();
  return convertResponseToAnthropic(openAIResponse);
}

/**
 * Get API key - kept for compatibility but not needed for Ollama
 */
function getApiKey() {
  return process.env.ANTHROPIC_API_KEY || 'ollama';
}

/**
 * Process a conversation turn with the LLM, handling tool calls
 */
async function chat(userMessage, history, toolDefinitions, toolExecutors) {
  // Add user message to history
  const messages = [...history, { role: 'user', content: userMessage }];

  let response = await callLLM(messages, toolDefinitions);
  let assistantContent = response.content;

  // Add assistant response to history
  messages.push({ role: 'assistant', content: assistantContent });

  // Handle tool use loop
  while (response.stop_reason === 'tool_use') {
    const toolResults = [];

    for (const block of assistantContent) {
      if (block.type === 'tool_use') {
        const executor = toolExecutors[block.name];
        let result;

        if (executor) {
          try {
            result = await executor(block.input);
          } catch (err) {
            result = { error: err.message };
          }
        } else {
          result = { error: `Unknown tool: ${block.name}` };
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }
    }

    // If no tools to execute, we're done
    if (toolResults.length === 0) {
      break;
    }

    // Add tool results to messages
    messages.push({ role: 'user', content: toolResults });

    // Get next response
    response = await callLLM(messages, toolDefinitions);
    assistantContent = response.content;

    // Add new assistant response to history
    messages.push({ role: 'assistant', content: assistantContent });
  }

  // Extract text response
  const textBlocks = assistantContent.filter((block) => block.type === 'text');
  const responseText = textBlocks.map((block) => block.text).join('\n');

  return {
    response: responseText,
    history: messages,
  };
}

module.exports = {
  chat,
  getApiKey,
};
