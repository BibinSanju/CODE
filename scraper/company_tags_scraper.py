import os
import csv
import json
import argparse

def get_companies(base_dir):
    """Returns a list of all available companies."""
    if not os.path.exists(base_dir):
        print(f"Error: Directory {base_dir} not found.")
        return []
    
    companies = []
    for item in os.listdir(base_dir):
        if os.path.isdir(os.path.join(base_dir, item)) and not item.startswith('.'):
            companies.append(item)
    return sorted(companies)

def parse_company_csv(filepath):
    """Parses a specific CSV file and returns a list of dictionaries."""
    questions = []
    if not os.path.exists(filepath):
        print(f"Warning: File {filepath} not found.")
        return questions
        
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Parse topics into a list
            topics = [t.strip() for t in row.get('Topics', '').split(',') if t.strip()]
            
            question = {
                "title": row.get('Title'),
                "difficulty": row.get('Difficulty'),
                "frequency": float(row.get('Frequency', 0)) if row.get('Frequency') else 0.0,
                "acceptanceRate": float(row.get('Acceptance Rate', 0)) if row.get('Acceptance Rate') else 0.0,
                "url": row.get('Link'),
                "topics": topics
            }
            questions.append(question)
            
    return questions

def process_company(base_dir, company_name, timeframe="5. All"):
    """Reads a company's CSV and returns the structured JSON data."""
    company_dir = os.path.join(base_dir, company_name)
    csv_file = f"{timeframe}.csv"
    filepath = os.path.join(company_dir, csv_file)
    
    questions = parse_company_csv(filepath)
    return {
        "company": company_name,
        "timeframe": timeframe,
        "total_questions": len(questions),
        "questions": questions
    }

def main():
    parser = argparse.ArgumentParser(description="Extract LeetCode Company Tags into JSON")
    parser.add_argument('--repo-dir', default='./leetcode-company-wise-problems', help="Path to the cloned repository")
    parser.add_argument('--company', type=str, help="Specific company name to extract (e.g., 'Google')")
    parser.add_argument('--out', default='company_tags.json', help="Output JSON file path")
    
    args = parser.parse_args()
    
    repo_dir = args.repo_dir
    
    # Check if repo exists
    if not os.path.exists(repo_dir):
        print(f"Error: Could not find the repository at '{repo_dir}'.")
        print("Please clone the repository first:")
        print("git clone https://github.com/liquidslr/leetcode-company-wise-problems.git")
        return

    companies = get_companies(repo_dir)
    
    if args.company:
        if args.company not in companies:
            print(f"Error: Company '{args.company}' not found in the dataset.")
            print("Available companies include:", ", ".join(companies[:10]), "...")
            return
        
        print(f"Processing data for {args.company}...")
        data = process_company(repo_dir, args.company)
        
        with open(args.out, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4)
        print(f"Success! Saved {data['total_questions']} questions to {args.out}")
        
    else:
        print("No specific company provided, extracting top 10 companies...")
        top_companies = ["Google", "Amazon", "Microsoft", "Meta", "Apple", "Netflix", "Uber", "LinkedIn", "Adobe", "Bloomberg"]
        
        all_data = []
        for company in top_companies:
            if company in companies:
                print(f"Processing data for {company}...")
                data = process_company(repo_dir, company)
                all_data.append(data)
                
        with open(args.out, 'w', encoding='utf-8') as f:
            json.dump(all_data, f, indent=4)
        print(f"Success! Saved data for {len(all_data)} companies to {args.out}")

if __name__ == "__main__":
    main()
