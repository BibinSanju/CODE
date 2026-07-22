import requests
import json
import os
import argparse
from datetime import datetime

# Optional: Google Generative AI for extracting question details
try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False

def fetch_discuss_posts(company, limit=10):
    """
    Fetches the latest interview experience posts from LeetCode Discuss for a specific company.
    """
    url = "https://leetcode.com/graphql"
    query = """
    query categoryTopicList($categories: [String!]!, $first: Int!, $orderBy: TopicSortingOption, $skip: Int, $query: String, $tags: [String!]) {
      categoryTopicList(categories: $categories, orderBy: $orderBy, skip: $skip, query: $query, first: $first, tags: $tags) {
        edges {
          node {
            id
            title
            post {
              creationDate
              content
            }
          }
        }
      }
    }
    """
    variables = {
        "categories": ["interview-question"],
        "first": limit,
        "orderBy": "newest_to_oldest",
        "skip": 0,
        "query": company
    }
    headers = {"Content-Type": "application/json"}
    
    print(f"Fetching latest {limit} posts for {company} from LeetCode Discuss...")
    response = requests.post(url, json={"query": query, "variables": variables}, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        edges = data.get("data", {}).get("categoryTopicList", {}).get("edges", [])
        posts = []
        for edge in edges:
            node = edge.get("node", {})
            post_data = node.get("post", {})
            
            # creationDate is a unix timestamp
            timestamp = post_data.get("creationDate")
            date_str = datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d') if timestamp else "Unknown"
            
            posts.append({
                "id": node.get("id"),
                "title": node.get("title"),
                "content": post_data.get("content", ""),
                "date": date_str
            })
        return posts
    else:
        print(f"Error fetching data: {response.status_code}")
        return []

def extract_question_with_llm(post_content):
    """
    Uses an LLM to extract the structured coding question from the raw forum post.
    """
    if not HAS_GENAI:
        return {"error": "google-generativeai library not installed. Returning raw text.", "raw_text": post_content[:500] + "..."}
        
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return {"error": "GEMINI_API_KEY environment variable not set. Returning raw text.", "raw_text": post_content[:500] + "..."}
        
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    prompt = f"""
    You are an expert at parsing technical interview experiences. 
    Analyze the following forum post and extract the exact coding problem they were asked.
    If it is a known LeetCode problem, give its exact title. If it's a custom problem, summarize the problem statement.
    Format your response strictly as a JSON object with two keys:
    "problem_title": (string) The title or best guess of the problem.
    "problem_summary": (string) A short summary of the problem statement.
    
    Post Content:
    {post_content}
    """
    
    try:
        response = model.generate_content(prompt)
        # Clean up Markdown formatting from the LLM output if present
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:-3]
        return json.loads(text)
    except Exception as e:
        return {"error": str(e), "raw_text": post_content[:500] + "..."}

def main():
    parser = argparse.ArgumentParser(description="Scrape LeetCode Discuss for recent interview questions")
    parser.add_argument('--company', type=str, default="Google", help="Company to search for (e.g., 'Google')")
    parser.add_argument('--limit', type=int, default=3, help="Number of posts to fetch")
    
    args = parser.parse_args()
    
    posts = fetch_discuss_posts(args.company, limit=args.limit)
    
    if not posts:
        print("No posts found.")
        return
        
    results = []
    for i, post in enumerate(posts):
        print(f"\n--- Processing Post {i+1}: {post['title']} ({post['date']}) ---")
        
        # Step 2: Use LLM to extract the question
        extraction = extract_question_with_llm(post['content'])
        
        result = {
            "post_title": post['title'],
            "post_date": post['date'],
            "company": args.company,
            "extracted_question": extraction
        }
        results.append(result)
        
        print(json.dumps(extraction, indent=2))
        
    # Save to JSON
    out_file = f"{args.company.lower()}_recent_interview_questions.json"
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=4)
        
    print(f"\nSaved structured data to {out_file}")

if __name__ == "__main__":
    main()
