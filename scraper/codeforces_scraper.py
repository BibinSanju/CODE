import requests
import cloudscraper
from bs4 import BeautifulSoup
import time

class CodeforcesScraper:
    def __init__(self):
        self.api_url = "https://codeforces.com/api/problemset.problems"
        self.base_url = "https://codeforces.com/problemset/problem/"
        self.scraper = cloudscraper.create_scraper(browser={'browser': 'chrome', 'platform': 'windows', 'desktop': True})

    def fetch_problem_list(self):
        """Fetches the list of all Codeforces problems."""
        response = self.scraper.get(self.api_url)
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "OK":
                return data.get("result", {}).get("problems", [])
        print(f"Error fetching problem list: {response.status_code}")
        return []

    def fetch_problem_html(self, contest_id, index):
        """Scrapes the problem statement HTML given the contestId and index."""
        url = f"{self.base_url}{contest_id}/{index}"
        response = self.scraper.get(url)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, "html.parser")
            # The problem statement is generally inside a div with class "problem-statement"
            statement_div = soup.find("div", class_="problem-statement")
            if statement_div:
                return str(statement_div)
            else:
                return "<p>Error: Could not parse problem statement from HTML.</p>"
        print(f"Error fetching HTML for problem {contest_id}{index}: {response.status_code}")
        return None

    def fetch_questions(self, limit=10):
        """
        High level function to fetch a list of Codeforces questions with their details and raw HTML content.
        """
        problems = self.fetch_problem_list()
        results = []
        count = 0
        
        for p in problems:
            if count >= limit:
                break
                
            contest_id = p.get("contestId")
            index = p.get("index")
            
            # Skip problems without standard contestId or index
            if not contest_id or not index:
                continue
                
            html_content = self.fetch_problem_html(contest_id, index)
            if html_content:
                # Codeforces doesn't have a direct "difficulty" string like LeetCode, it uses "rating" (e.g., 800, 1500)
                rating = p.get("rating")
                difficulty_str = f"Rating {rating}" if rating else "Unrated"
                
                results.append({
                    "title": f"{index}. {p.get('name')}",
                    "titleSlug": f"{contest_id}-{index}", # Unique identifier
                    "difficulty": difficulty_str,
                    "tags": p.get("tags", []),
                    "html_content": html_content
                })
                count += 1
                # Small delay to prevent rate limiting / IP bans from Codeforces
                time.sleep(2)
            
        return results

if __name__ == "__main__":
    scraper = CodeforcesScraper()
    print("Fetching 2 questions from Codeforces to test...")
    questions = scraper.fetch_questions(limit=2)
    for q in questions:
        print(f"Title: {q['title']}")
        print(f"Difficulty: {q['difficulty']}")
        print(f"Tags: {q['tags']}")
        content_len = len(q['html_content']) if q.get('html_content') else 0
        print(f"Content Length: {content_len} chars")
        if content_len > 0:
            print(f"Full Content:\n{q['html_content']}")
        print("-" * 50)
