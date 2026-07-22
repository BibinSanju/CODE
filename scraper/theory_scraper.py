import requests
from bs4 import BeautifulSoup
import json
import uuid
import os
import psycopg2
from typing import List, Dict
from dotenv import load_dotenv

class BaseScraper:
    def __init__(self, source_name: str, category: str):
        self.source_name = source_name
        self.category = category
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }

    def fetch_page(self, url: str) -> str:
        try:
            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()
            return response.text
        except Exception as e:
            print(f"Error fetching {url}: {e}")
            return ""

    def parse(self, html: str, url: str) -> List[Dict]:
        raise NotImplementedError

    def scrape(self, url: str) -> List[Dict]:
        print(f"Scraping {url} via {self.source_name} scraper...")
        html = self.fetch_page(url)
        if not html:
            return []
        return self.parse(html, url)
        
    def generate_metadata(self, question: str, answer: str) -> Dict:
        return {
            "concise_answer": answer[:150] + "..." if len(answer) > 150 else answer,
            "expected_keywords": [],
            "expected_concepts": [],
            "scoring_rubric": {
                "max_score": 100,
                "criteria": ["Explains core concept (50 pts)", "Provides relevant technical details (50 pts)"]
            }
        }

class JavaTPointScraper(BaseScraper):
    def __init__(self, category: str):
        super().__init__("JavaTPoint", category)

    def parse(self, html: str, url: str) -> List[Dict]:
        soup = BeautifulSoup(html, 'html.parser')
        results = []
        questions = soup.find_all('h3', class_='h3')
        for q_tag in questions:
            question_text = q_tag.get_text(strip=True).lstrip('0123456789.) ')
            answer_text = ""
            sibling = q_tag.find_next_sibling()
            while sibling and sibling.name not in ['h3', 'h2']:
                if sibling.name == 'p':
                    answer_text += sibling.get_text(strip=True) + " "
                sibling = sibling.find_next_sibling()
                
            if answer_text:
                metadata = self.generate_metadata(question_text, answer_text)
                results.append({
                    "title": question_text[:200],
                    "description": f"**Question:**\n{question_text}\n\n**Source:** {self.source_name}",
                    "category": self.category,
                    "metadata": {
                        "detailed_answer": answer_text.strip(),
                        "concise_answer": metadata["concise_answer"],
                        "scoring_rubric": metadata["scoring_rubric"]
                    }
                })
        return results

class InterviewBitScraper(BaseScraper):
    def __init__(self, category: str):
        super().__init__("InterviewBit", category)

    def parse(self, html: str, url: str) -> List[Dict]:
        soup = BeautifulSoup(html, 'html.parser')
        results = []
        sections = soup.find_all('section')
        for section in sections:
            q_tag = section.find('h3')
            if not q_tag:
                continue
            question_text = q_tag.get_text(strip=True)
            answer_div = section.find('div', class_=lambda x: x and 'answer' in x) 
            if not answer_div:
                answer_div = section.find('article')
                
            if answer_div:
                answer_text = answer_div.get_text(separator=' ', strip=True)
                metadata = self.generate_metadata(question_text, answer_text)
                results.append({
                    "title": question_text[:200],
                    "description": f"**Question:**\n{question_text}\n\n**Source:** {self.source_name}",
                    "category": self.category,
                    "metadata": {
                        "detailed_answer": answer_text,
                        "concise_answer": metadata["concise_answer"],
                        "scoring_rubric": metadata["scoring_rubric"]
                    }
                })
        return results

class GeeksForGeeksScraper(BaseScraper):
    def __init__(self, category: str):
        super().__init__("GeeksForGeeks", category)

    def parse(self, html: str, url: str) -> List[Dict]:
        soup = BeautifulSoup(html, 'html.parser')
        results = []
        # GFG usually uses article tags or text within main body, let's keep it broad
        # For specific question lists, they might use h3 or strong tags
        content_div = soup.find('div', class_='text')
        if not content_div:
            return results
            
        paragraphs = content_div.find_all(['p', 'h3'])
        current_q = None
        current_ans = ""
        
        for p in paragraphs:
            strong = p.find('strong')
            if p.name == 'h3' or (strong and p.get_text().strip().startswith(('Q', '1.', '2.', '3.'))):
                if current_q and current_ans:
                    metadata = self.generate_metadata(current_q, current_ans)
                    results.append({
                        "title": current_q[:200],
                        "description": f"**Question:**\n{current_q}\n\n**Source:** {self.source_name}",
                        "category": self.category,
                        "metadata": {
                            "detailed_answer": current_ans.strip(),
                            "concise_answer": metadata["concise_answer"],
                            "scoring_rubric": metadata["scoring_rubric"]
                        }
                    })
                current_q = p.get_text(strip=True)
                current_ans = ""
            elif current_q:
                current_ans += p.get_text(strip=True) + " "
                
        # push last one
        if current_q and current_ans:
            metadata = self.generate_metadata(current_q, current_ans)
            results.append({
                "title": current_q[:200],
                "description": f"**Question:**\n{current_q}\n\n**Source:** {self.source_name}",
                "category": self.category,
                "metadata": {
                    "detailed_answer": current_ans.strip(),
                    "concise_answer": metadata["concise_answer"],
                    "scoring_rubric": metadata["scoring_rubric"]
                }
            })
            
        return results

class SimplilearnScraper(BaseScraper):
    def __init__(self, category: str):
        super().__init__("Simplilearn", category)

    def parse(self, html: str, url: str) -> List[Dict]:
        soup = BeautifulSoup(html, 'html.parser')
        results = []
        
        # Simplilearn typically uses article or content divs, with headings for questions
        content_div = soup.find('div', class_='article-body')
        if not content_div:
            content_div = soup
            
        headings = content_div.find_all(['h2', 'h3'])
        
        for h in headings:
            question_text = h.get_text(strip=True)
            if not question_text.lower().startswith(('q', 'what', 'how', 'explain', 'why', 'name', 'list', 'define', '1', '2', '3', '4', '5', '6', '7', '8', '9')):
                continue
                
            answer_text = ""
            sibling = h.find_next_sibling()
            
            while sibling and sibling.name not in ['h2', 'h3']:
                if sibling.name == 'p':
                    answer_text += sibling.get_text(strip=True) + " "
                elif sibling.name == 'ul' or sibling.name == 'ol':
                    for li in sibling.find_all('li'):
                        answer_text += "- " + li.get_text(strip=True) + "\n"
                sibling = sibling.find_next_sibling()
                
            if answer_text.strip():
                metadata = self.generate_metadata(question_text, answer_text)
                results.append({
                    "title": question_text[:200],
                    "description": f"**Question:**\n{question_text}\n\n**Source:** {self.source_name}",
                    "category": self.category,
                    "metadata": {
                        "detailed_answer": answer_text.strip(),
                        "concise_answer": metadata["concise_answer"],
                        "scoring_rubric": metadata["scoring_rubric"]
                    }
                })
        return results

def main():
    env_path = os.path.join(os.path.dirname(__file__), '..', 'backend', '.env')
    load_dotenv(env_path)

    db_url = os.getenv('DIRECT_URL') or os.getenv('DATABASE_URL')
    if not db_url:
        print("Error: Could not find DIRECT_URL or DATABASE_URL in backend/.env")
        exit(1)

    print("Connecting to Supabase PostgreSQL...")
    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
    except Exception as e:
        print("Failed to connect to the database:", e)
        exit(1)

    scrapers = [
        # Cyber Security
        (JavaTPointScraper("Cyber Security"), "https://www.javatpoint.com/cyber-security-interview-questions"),
        (InterviewBitScraper("Cyber Security"), "https://www.interviewbit.com/cyber-security-interview-questions/"),
        
        # DBMS
        (InterviewBitScraper("DBMS"), "https://www.interviewbit.com/dbms-interview-questions/"),
        
        # System Design
        (InterviewBitScraper("System Design"), "https://www.interviewbit.com/system-design-interview-questions/"),
        
        # Machine Learning
        (InterviewBitScraper("Machine Learning"), "https://www.interviewbit.com/machine-learning-interview-questions/"),
        
        # Computer Networks
        (InterviewBitScraper("Computer Networks"), "https://www.interviewbit.com/networking-interview-questions/"),
        
        # Cloud Computing
        (GeeksForGeeksScraper("Cloud Computing"), "https://www.geeksforgeeks.org/cloud-computing-interview-questions/"),
        
        # Operating Systems
        (InterviewBitScraper("Operating Systems"), "https://www.interviewbit.com/operating-system-interview-questions/"),
    ]
    
    all_data = []
    
    for scraper, url in scrapers:
        try:
            data = scraper.scrape(url)
            print(f"Extracted {len(data)} questions from {scraper.source_name} for {scraper.category}")
            all_data.extend(data)
        except Exception as e:
            print(f"Failed to scrape {url}: {e}")
            
    print(f"\nTotal extracted questions: {len(all_data)}")
    
    # Seed into database
    inserted = 0
    skipped = 0
    
    for item in all_data:
        title = item['title']
        cursor.execute('SELECT id FROM "Question" WHERE title = %s', (title,))
        if cursor.fetchone():
            skipped += 1
            continue
            
        q_id = str(uuid.uuid4())
        try:
            cursor.execute('''
                INSERT INTO "Question" (id, category, subtopic, type, difficulty, title, description, metadata)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                q_id, 
                item['category'], 
                "General", 
                "Theory", 
                "Medium", 
                title, 
                item['description'], 
                json.dumps(item['metadata'])
            ))
            conn.commit()
            inserted += 1
        except Exception as e:
            print(f"Error inserting {title}: {e}")
            conn.rollback()

    print(f"Successfully inserted {inserted} Theory questions into the database (Skipped {skipped} duplicates).")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    main()
