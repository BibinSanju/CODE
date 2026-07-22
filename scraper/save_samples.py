import json
import os
from leetcode_scraper import LeetCodeScraper
from codeforces_scraper import CodeforcesScraper

def main():
    print("Fetching LeetCode samples...")
    lc_scraper = LeetCodeScraper()
    lc_questions = lc_scraper.fetch_questions(limit=2)
    
    print("Fetching Codeforces samples...")
    cf_scraper = CodeforcesScraper()
    cf_questions = cf_scraper.fetch_questions(limit=2)
    
    data = {
        "leetcode": lc_questions,
        "codeforces": cf_questions
    }
    
    output_path = os.path.join(os.path.dirname(__file__), "samples.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
        
    print(f"Saved to {output_path}")

if __name__ == "__main__":
    main()
