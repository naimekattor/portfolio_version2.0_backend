export class ChunkingService {
  private maxCharLength: number;
  
  constructor(maxCharLength = 3000) { // ~750 tokens
    this.maxCharLength = maxCharLength;
  }
  
  /**
   * Splits text into chunks while attempting to preserve paragraph boundaries.
   */
  public chunkText(text: string): string[] {
    if (!text) return [];
    
    const chunks: string[] = [];
    const paragraphs = text.split(/\n\s*\n/);
    
    let currentChunk = '';
    
    for (const p of paragraphs) {
      if ((currentChunk.length + p.length) < this.maxCharLength) {
        currentChunk += (currentChunk ? '\n\n' : '') + p;
      } else {
        if (currentChunk) chunks.push(currentChunk);
        
        // If a single paragraph is too large, split it further
        if (p.length > this.maxCharLength) {
           const smallChunks = p.match(new RegExp(`.{1,${this.maxCharLength}}`, 'g')) || [];
           for(let i = 0; i < smallChunks.length - 1; i++) {
               chunks.push(smallChunks[i]);
           }
           currentChunk = smallChunks[smallChunks.length - 1];
        } else {
           currentChunk = p;
        }
      }
    }
    
    if (currentChunk) chunks.push(currentChunk);
    
    return chunks.map(c => c.trim()).filter(c => c.length > 0);
  }
}
