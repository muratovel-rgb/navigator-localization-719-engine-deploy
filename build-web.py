"""Package the existing HTML interface with the one canonical root engine."""
from pathlib import Path
import json,re
root=Path(__file__).resolve().parent
web=root/'web'
html=(web/'index.html').read_text()
html=html.replace('<link rel="stylesheet" href="style.css">','<style>\n'+(web/'style.css').read_text()+'\n</style>')
scripts=[]
for name in re.findall(r'<script defer src="([^"]+)"></script>',html):
    if name=='pp719-index.js':
        content='globalThis.PP719IndexData='+json.dumps(json.loads((root/'pp719-index.json').read_text()),ensure_ascii=False)+';'
    elif name=='tpp52-checks.js':
        content='globalThis.Tpp52Checks='+json.dumps(json.loads((root/'tpp52-checks.draft.json').read_text()),ensure_ascii=False)+';'
    else:
        content=(web/name).resolve().read_text()
    scripts.append('<script>\n'+re.sub(r'</script',r'<\\/script',content,flags=re.I)+'\n</script>')
html=re.sub(r'<script defer src="[^"]+"></script>','',html)
html=html.replace('</body>','\n'.join(scripts)+'</body>')
out=root/'dist'/'navigator-719-tpp52-preview.html';out.parent.mkdir(exist_ok=True)
out.write_text(html)
print(out, out.stat().st_size, 'bytes')
