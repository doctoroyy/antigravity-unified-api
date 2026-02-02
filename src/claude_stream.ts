export class ClaudeStreamAdapter {
  private writer: WritableStreamDefaultWriter<Uint8Array>;
  private encoder: TextEncoder;
  private model: string;
  private blockIndex: number = 0;
  private messageStartSent: boolean = false;
  private currentBlockType: "text" | "thinking" | "tool_use" | null = null;

  constructor(writer: WritableStreamDefaultWriter<Uint8Array>, model: string) {
    this.writer = writer;
    this.encoder = new TextEncoder();
    this.model = model;
  }

  async pushEvent(type: string, data: any) {
    const str = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
    await this.writer.write(this.encoder.encode(str));
  }

  async handleGeminiChunk(chunk: any) {
    // 1. Message Start (once)
    if (!this.messageStartSent) {
      await this.pushEvent("message_start", {
        type: "message_start",
        message: {
          id: chunk.responseId || "msg_" + Math.random().toString(36).slice(2),
          type: "message",
          role: "assistant",
          model: this.model,
          content: [],
          stop_reason: null,
          stop_sequence: null,
          usage: { input_tokens: 0, output_tokens: 0 } // Placeholder
        }
      });
      this.messageStartSent = true;
    }

    const candidate = chunk.candidates?.[0];
    if (!candidate) {
       // Check usage metadata only
       if (chunk.usageMetadata) {
         // emit usage?
       }
       return;
    }

    const part = candidate.content?.parts?.[0];
    const finishReason = candidate.finishReason;

    if (part) {
      // Handle Thinking
      if (part.thought) {
        if (this.currentBlockType !== "thinking") {
          await this.endCurrentBlock();
          await this.startBlock("thinking", { type: "thinking", thinking: "" });
        }
        await this.pushEvent("content_block_delta", {
           type: "content_block_delta",
           index: this.blockIndex,
           delta: { type: "thinking_delta", thinking: part.text || "" }
        });
        // Signature handling would go here (delta: signature_delta)
        if (part.thoughtSignature) {
           await this.pushEvent("content_block_delta", {
             type: "content_block_delta",
             index: this.blockIndex, 
             delta: { type: "signature_delta", signature: part.thoughtSignature }
           });
        }
      } 
      // Handle Function Call (Tool Use)
      else if (part.functionCall) {
        await this.endCurrentBlock();
        const toolUseId = "toolu_" + Math.random().toString(36).slice(2);
        await this.startBlock("tool_use", {
           type: "tool_use",
           id: toolUseId,
           name: part.functionCall.name,
           input: {} // We stream empty input first? Or just full input? Gemini sends full input usually.
        });
        // Gemini sends full args in one go usually, but we need to stream it?
        // Actually Gemini functionCall args is an object. Claude expects input usually.
        // We can just send input JSON?
        // Claude expects `input_json_delta`? No, simpler to just send full input in `tool_use` block if possible, 
        // OR stream partial JSON if we were getting partials. Gemini usually sends full JSON object.
        // Let's just output it as a static block for simplicity if we can/
        // Wait, content_block_start for tool_use usually has empty input?
        // Let's mimic streaming input.
        const argsStr = JSON.stringify(part.functionCall.args || {});
        // Split into chunks if needed, or just one delta (partial_json is for text format tool use?)
        // Claude "tool_use" content block has "input" field which is Value.
        // But in streaming, we send `input_json_delta`.
        
        // Correct flow:
        // 1. content_block_start type=tool_use (id, name, input={})
        // 2. content_block_delta type=input_json_delta (partial_json = "...")
        // 3. content_block_stop
        
        await this.pushEvent("content_block_delta", {
            type: "content_block_delta", 
            index: this.blockIndex,
            delta: { type: "input_json_delta", partial_json: argsStr } 
        });
        
        await this.endCurrentBlock(); // immediately end
      }
      // Handle Text
      else if (part.text) {
        if (this.currentBlockType !== "text") {
          await this.endCurrentBlock();
          await this.startBlock("text", { type: "text", text: "" });
        }
        await this.pushEvent("content_block_delta", {
           type: "content_block_delta",
           index: this.blockIndex,
           delta: { type: "text_delta", text: part.text }
        });
      }
    }

    if (finishReason) {
       await this.endCurrentBlock();
       const stopReason = finishReason === "STOP" ? "end_turn" : 
                          finishReason === "MAX_TOKENS" ? "max_tokens" : "stop_sequence";
       await this.pushEvent("message_delta", {
          type: "message_delta",
          delta: { stop_reason: stopReason, stop_sequence: null },
          usage: { output_tokens: chunk.usageMetadata?.candidatesTokenCount || 0 }
       });
       await this.pushEvent("message_stop", { type: "message_stop" });
    }
  }

  async startBlock(type: "text" | "thinking" | "tool_use", content: any) {
    this.currentBlockType = type;
    await this.pushEvent("content_block_start", {
      type: "content_block_start",
      index: this.blockIndex,
      content_block: content
    });
  }

  async endCurrentBlock() {
    if (this.currentBlockType) {
      await this.pushEvent("content_block_stop", {
        type: "content_block_stop",
        index: this.blockIndex
      });
      this.blockIndex++;
      this.currentBlockType = null;
    }
  }
}
