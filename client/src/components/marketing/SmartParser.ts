/**
 * Safely parse a loose JS-array/object literal (unquoted keys, single quotes,
 * trailing commas) into a value by normalizing it into valid JSON and using
 * JSON.parse. This never executes the input as code. Returns [] on failure.
 */
const safeParseLooseArray = (input: string): any[] => {
  try {
    // 1) Strip JS comments.
    let s = input.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n\r]*/g, '$1');

    // 2) Convert single-quoted strings to double-quoted, escaping any embedded
    //    double quotes so the result stays valid JSON.
    s = s.replace(/'((?:[^'\\]|\\.)*)'/g, (_m, inner: string) => {
      const unescaped = inner.replace(/\\'/g, "'");
      const escaped = unescaped.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      return `"${escaped}"`;
    });

    // 3) Quote unquoted object keys: { key: ... } -> { "key": ... }
    s = s.replace(/([{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)(\s*):/g, '$1"$2"$3:');

    // 4) Remove trailing commas before } or ].
    s = s.replace(/,(\s*[}\]])/g, '$1');

    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to parse demos array', e);
    return [];
  }
};

export const parseMarketingText = (text: string) => {
  const data: any = {
    pluginName: '',
    trailerVideo: '',
    tutorialVideo: '',
    wpOrgUrl: '',
    docsUrl: '',
    heroDescription: '',
    thumbnailImage: '',
    problemList: [],
    smarterWayList: [],
    keyFeatures: [],
    allFeatures: [],
    proFeaturesDesc: '',
    demos: [],
    topRatingLink: '',
    screenshots: [],
    faqs: []
  };

  try {
    const extractField = (regex: RegExp) => {
      const match = text.match(regex);
      return match ? match[1].trim().replace(/^{|}$/g, '').trim() : '';
    };

    data.pluginName = extractField(/Plugin Name:\s*(.*)/i);
    data.trailerVideo = extractField(/Trailer video:\s*(.*)/i);
    data.tutorialVideo = extractField(/Tutorial video:\s*(.*)/i);
    data.wpOrgUrl = extractField(/WP\.org URL:\s*(.*)/i);
    data.docsUrl = extractField(/Docs URL:\s*(.*)/i);
    data.thumbnailImage = extractField(/Thumbnail Image[^\n]*\n(.*)/i);

    const topRatingMatch = text.match(/Top.*rating.*\[([\s\S]*?)\]/i) || text.match(/Top.*stat?r rating link[^\n]*\n?(.*)/i);
    if (topRatingMatch) {
      data.topRatingLink = topRatingMatch[1].trim();
    }

    // Hero Description
    const heroMatch = text.match(/Short Description.*?\n([\s\S]*?)(?=\n== Why Choose|\n⭐ Why Choose|\nThumbnail)/i);
    if (heroMatch) data.heroDescription = heroMatch[1].trim();

    // Problem List
    const problemMatch = text.match(/(?:❌ )?The Problem[^\n]*\n([\s\S]*?)(?=\n(?:✅ )?A Smarter Way)/i);
    if (problemMatch) {
      data.problemList = problemMatch[1].split('\n').map(l => l.trim()).filter(l => l.length > 0);
    }

    // Smarter Way List
    const smarterMatch = text.match(/(?:✅ )?A Smarter Way[^\n]*\n([\s\S]*?)(?=\n== 4|🚀 4 Key)/i);
    if (smarterMatch) {
      const lines = smarterMatch[1].split('\n').map(l => l.trim()).filter(l => l.length > 0);
      data.smarterWayList = lines;
    }

    // Key Features
    const keyFeaturesMatch = text.match(/4\s*Key Features Section[^\n]*\n([\s\S]*?)(?=\n== All Features|\n📦 All Features)/i);
    if (keyFeaturesMatch) {
      // Split by Title: or 1️⃣
      const parts = keyFeaturesMatch[1].split(/Title\s*:|1️⃣|2️⃣|3️⃣|4️⃣/i).filter(p => p.trim().length > 0);
      data.keyFeatures = parts.map(part => {
        const titleMatch = part.match(/^([^\n]+)/);
        const descMatch = part.match(/Des\s*:\s*([^\n]+)/i) || part.match(/\n([^\n]+)/);
        const listMatch = part.match(/List\s*:\s*([\s\S]*)/i);
        
        let title = titleMatch ? titleMatch[1].trim() : '';
        let description = descMatch ? descMatch[1].trim() : '';
        let list: string[] = [];

        if (listMatch) {
          list = listMatch[1].replace(/[\[\]]/g, '').split('\n').map(l => l.trim()).filter(l => l.length > 0);
        } else if (!part.match(/Des\s*:/i)) {
          // Fallback for old format
          const lines = part.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          title = lines[0] || '';
          description = lines[1] || '';
          list = lines.slice(2).filter(l => l.startsWith('-'));
        }

        return { title, description, list, mediaUrl: '' };
      });
    }

    // All Features
    const allFeaturesMatch = text.match(/All Features[^\n]*\n([\s\S]*?)(?=\nDemos|\n💎 Pro Features)/i);
    if (allFeaturesMatch) {
      const parts = allFeaturesMatch[1].split(/Title\s*:/i).filter(p => p.trim().length > 0);
      
      if (parts.length > 1 || allFeaturesMatch[1].includes('Title:')) {
        // New format
        data.allFeatures = parts.map(part => {
          const titleMatch = part.match(/^([^\n]+)/);
          const descMatch = part.match(/Des\s*:\s*([\s\S]*?)(?=\nTitle:|$)/i);
          return {
            title: titleMatch ? titleMatch[1].trim() : '',
            description: descMatch ? descMatch[1].trim() : '',
            list: []
          };
        });
      } else {
        // Old format fallback
        const lines = allFeaturesMatch[1].split('\n').map(l => l.trim()).filter(l => l.length > 0);
        for (let i = 0; i < lines.length; i += 2) {
          if (lines[i] && lines[i + 1]) {
            data.allFeatures.push({ title: lines[i], description: lines[i + 1] });
          }
        }
      }
    }

    // JSON Layout extraction
    const jsonMatch = text.match(/Demos\s*(\[\s*\{[\s\S]*?\}\s*,?\s*\])/i);
    if (jsonMatch) {
      // Normalize the loose JS-array literal into valid JSON and parse it.
      // This never executes the pasted text as code.
      const parsedArray = safeParseLooseArray(jsonMatch[1]);
      if (parsedArray.length > 0) {
        data.demos = parsedArray;
      }
    }

    // Screenshots
    const screenshotsMatch = text.match(/Screenshots[^\n]*\n([\s\S]*?)(?=\nPlugin FAQs)/i);
    if (screenshotsMatch) {
      const lines = screenshotsMatch[1].split('\n').map(l => l.trim()).filter(l => l.length > 0);
      data.screenshots = lines.map(line => {
        const [title, urlPart] = line.split('–').map(s => s.trim());
        let url = urlPart || '';
        url = url.replace(/^{|}$/g, '').trim();
        return { title: title || '', url };
      });
    }

    // FAQs
    const faqsMatch = text.match(/Plugin FAQs([\s\S]*)$/i);
    if (faqsMatch) {
      const faqText = faqsMatch[1];
      const qSplit = faqText.split(/(?:\*\*|)?Q:(?:\*\*|)?/).filter(q => q.trim().length > 0);
      data.faqs = qSplit.map(block => {
        const parts = block.split(/(?:\n|^)(?:A:|Yes,|No,)/i); // Simple heuristic if "A:" is missing, often starts with Yes/No
        const question = parts[0]?.trim() || '';
        let answer = '';
        if (parts.length > 1) {
            // Restore the matched 'Yes' or 'No' if it wasn't 'A:'
            const answerText = block.substring(question.length).trim();
            answer = answerText.startsWith('A:') ? answerText.substring(2).trim() : answerText;
        } else {
            // Sometimes it's just on the next line
            const lines = block.split('\n').filter(l=>l.trim().length>0);
            if(lines.length > 1) {
                answer = lines.slice(1).join('\n').trim();
            }
        }
        return { question, answer };
      }).filter((f: any) => f.question && f.answer);
    }

  } catch (error) {
    console.error("Parser error", error);
  }

  return data;
};
