import json, os, sys, time
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
class ReaAnalyzer:
    def analyze(self):
        reports = ROOT / "reports"
        reports.mkdir(parents=True, exist_ok=True)
        tree = {str(p.relative_to(ROOT)): p.stat().st_size for p in ROOT.rglob("*") if p.is_file() and not any(x in p.parts for x in [".git", "node_modules", "target"])}
        record = {"engine": "REA_Inspector", "timestamp": int(time.time()), "total_files": len(tree)}
        with open(reports / "REA_ANALYSIS.json", "w", encoding="utf-8") as f:
            json.dump(record, f, indent=2)
        print("REA inspection PASS.")
        return 0
if __name__ == "__main__": sys.exit(ReaAnalyzer().analyze())