import re
import urllib.parse
import logging
from typing import List, Dict, Any
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

# Heuristics to detect whether web search is genuinely needed
SEARCH_TRIGGER_WORDS = [
    r"\blatest\b", r"\brecent\b", r"\bcurrent\b", r"\btoday\b", r"\bnews\b",
    r"\brelease\b", r"\breleased\b", r"\bupcoming\b", r"\bweather\b",
    r"\bprice\b", r"\bstock\b", r"\bsearch\s+(the\s+)?web\b",
    r"\bsearch\s+online\b", r"\bfind\s+(online|on\s+google)\b",
    r"\b2024\b", r"\b2025\b", r"\b2026\b"
]

def should_perform_web_search(query: str, explicit_flag: bool = None) -> bool:
    """
    Decides whether web search is necessary.
    Uses user flag if explicitly provided, else applies smart keyword heuristics.
    """
    if explicit_flag is not None:
        return explicit_flag

    query_lower = query.lower()
    
    # Exclude common conversational or personal prompts from accidental search
    conversational_patterns = [
        r"^(hi|hello|hey|greetings|good\s+morning|good\s+evening)\b",
        r"\bhow\s+are\s+you\b",
        r"\bi\s+feel\s+(sad|stressed|overwhelmed|happy|lonely|anxious)\b",
        r"\bcreate\s+(a\s+)?document\b",
        r"\bwrite\s+(a\s+)?study\s+note\b",
        r"\bupdate\s+this\s+document\b"
    ]
    for cp in conversational_patterns:
        if re.search(cp, query_lower):
            return False

    for pattern in SEARCH_TRIGGER_WORDS:
        if re.search(pattern, query_lower):
            return True

    return False

async def search_duckduckgo(query: str, num_results: int = 4) -> List[Dict[str, str]]:
    """
    Zero-key DuckDuckGo search using DuckDuckGo Lite endpoint.
    No API key required. Highly reliable, fast, and free.
    """
    import html as html_lib
    results: List[Dict[str, str]] = []
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Content-Type": "application/x-www-form-urlencoded"
    }

    try:
        url = "https://lite.duckduckgo.com/lite/"
        data = {"q": query}
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
            resp = await client.post(url, data=data, headers=headers)
            if resp.status_code == 200:
                html_text = resp.text
                
                # Match result links: href="..." class='result-link'>...</a>
                links = re.findall(
                    r'<a[^>]+href=[\'"]([^\'"]+)[\'"][^>]+class=[\'"]result-link[\'"][^>]*>([\s\S]*?)</a>',
                    html_text
                )
                
                # Match snippets: <td class="result-snippet">...</td>
                snippets = re.findall(
                    r'<td[^>]*class=[\'"]result-snippet[\'"][^>]*>([\s\S]*?)</td>',
                    html_text
                )
                
                for i in range(min(len(links), num_results)):
                    raw_url, raw_title = links[i]
                    
                    # Unquote DuckDuckGo redirect uddg url if present
                    if "uddg=" in raw_url:
                        parsed = urllib.parse.parse_qs(urllib.parse.urlparse(raw_url).query)
                        clean_url = parsed.get("uddg", [raw_url])[0]
                    elif raw_url.startswith("//"):
                        clean_url = "https:" + raw_url
                    else:
                        clean_url = raw_url
                        
                    clean_title = html_lib.unescape(re.sub(r'<[^>]+>', '', raw_title).strip())
                    clean_snippet = ""
                    if i < len(snippets):
                        clean_snippet = html_lib.unescape(re.sub(r'<[^>]+>', '', snippets[i]).strip())
                        
                    if clean_title and (clean_url.startswith("http://") or clean_url.startswith("https://")):
                        results.append({
                            "title": clean_title,
                            "url": clean_url,
                            "snippet": clean_snippet or clean_title
                        })
    except Exception as e:
        logger.warning(f"DuckDuckGo search error: {str(e)}")

    # Fallback to DuckDuckGo Instant Answer API if lite search returned nothing
    if not results:
        try:
            api_url = f"https://api.duckduckgo.com/?q={urllib.parse.quote(query)}&format=json&no_html=1&skip_disambig=1"
            async with httpx.AsyncClient(timeout=5.0) as client:
                r = await client.get(api_url, headers=headers)
                if r.status_code == 200:
                    data = r.json()
                    abstract = data.get("AbstractText")
                    source_url = data.get("AbstractURL")
                    source_heading = data.get("Heading")
                    if abstract and source_url:
                        results.append({
                            "title": source_heading or "DuckDuckGo Instant Answer",
                            "url": source_url,
                            "snippet": abstract
                        })
                    for topic in data.get("RelatedTopics", [])[:3]:
                        if isinstance(topic, dict) and "Text" in topic and "FirstURL" in topic:
                            results.append({
                                "title": topic.get("Text")[:60] + "...",
                                "url": topic.get("FirstURL"),
                                "snippet": topic.get("Text")
                            })
        except Exception as e:
            logger.warning(f"Instant Answer API search error: {str(e)}")

    return results[:num_results]

async def search_tavily(query: str, api_key: str, num_results: int = 4) -> List[Dict[str, str]]:
    """Tavily search API integration if user configures a Tavily SEARCH_API_KEY."""
    results = []
    try:
        url = "https://api.tavily.com/search"
        payload = {
            "api_key": api_key,
            "query": query,
            "search_depth": "basic",
            "max_results": num_results
        }
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                for item in data.get("results", []):
                    results.append({
                        "title": item.get("title", "Search Result"),
                        "url": item.get("url", ""),
                        "snippet": item.get("content", "")
                    })
    except Exception as e:
        logger.error(f"Tavily search error: {str(e)}")
    return results

async def perform_web_search(query: str, num_results: int = 4) -> List[Dict[str, str]]:
    """
    Main entry point for web search.
    Defaults to zero-key DuckDuckGo search or uses Tavily if SEARCH_API_KEY is configured.
    """
    if settings.SEARCH_API_KEY:
        results = await search_tavily(query, settings.SEARCH_API_KEY, num_results)
        if results:
            return results

    return await search_duckduckgo(query, num_results)
