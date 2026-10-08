import json

with open('data/guests.js', 'r', encoding='utf-8') as f:
    text = f.read()
start = text.find('[')
end = text.rfind(']') + 1
guests = json.loads(text[start:end])

for g in guests:
    print(f"{g['id']:2d} | {g['name']:30s} | {g.get('phone', ''):12s} | {g.get('passes', 1)} pases | {g['slug']}")
