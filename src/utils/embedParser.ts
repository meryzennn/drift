export interface EmbedData {
  type: 'youtube' | 'facebook';
  url: string;
  originalUrl: string;
  isVertical?: boolean;
}

export function parseEmbeds(content: string): { cleanContent: string; embeds: EmbedData[] } {
  const embeds: EmbedData[] = [];
  let cleanContent = content;

  // Clean up optional /yt or /fb prefixes if user typed them
  cleanContent = cleanContent.replace(/\/yt\s+/gi, '');
  cleanContent = cleanContent.replace(/\/fb\s+/gi, '');

  // YouTube Regex (matches youtube.com/watch?v=, youtu.be/, youtube.com/shorts/, including trailing params)
  const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[^\s]*)/gi;
  
  // Facebook Video Regex (matches facebook.com/video, fb.watch, facebook.com/share/v/, facebook.com/share/r/, facebook.com/reel/)
  const fbRegex = /(?:https?:\/\/)?(?:www\.)?(?:facebook\.com\/(?:video\.php\?v=\d+|.*?\/videos\/\d+|share\/[vr]\/[a-zA-Z0-9_-]+\/?|reel\/\d+\/?)|fb\.watch\/[a-zA-Z0-9_-]+\/?)/gi;

  // Extract YouTube embeds
  const ytMatches = Array.from(content.matchAll(ytRegex));
  for (const match of ytMatches) {
    const videoId = match[1];
    const originalUrl = match[0];
    
    // Check if it's already extracted to avoid duplicates
    if (!embeds.find(e => e.originalUrl === originalUrl)) {
      const isVertical = originalUrl.includes('/shorts/');
      
      embeds.push({
        type: 'youtube',
        url: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}`,
        originalUrl,
        isVertical
      });
      // Remove the URL from the clean text
      cleanContent = cleanContent.replace(originalUrl, '').trim();
    }
  }

  // Extract Facebook embeds
  const fbMatches = Array.from(content.matchAll(fbRegex));
  for (const match of fbMatches) {
    const originalUrl = match[0];
    
    if (!embeds.find(e => e.originalUrl === originalUrl)) {
      // Facebook embed URL
      const encodedUrl = encodeURIComponent(originalUrl.startsWith('http') ? originalUrl : `https://${originalUrl}`);
      const isVertical = originalUrl.includes('/reel/') || originalUrl.includes('/share/r/');
      
      embeds.push({
        type: 'facebook',
        url: `https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=false&width=${isVertical ? 350 : 500}&autoplay=1&mute=1`,
        originalUrl,
        isVertical
      });
      // Remove the URL from the clean text
      cleanContent = cleanContent.replace(originalUrl, '').trim();
    }
  }

  return { cleanContent, embeds };
}
