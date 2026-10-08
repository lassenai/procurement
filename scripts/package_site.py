"""Package only intended files; never include reference PDFs or local study records."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import shutil

root=Path(__file__).resolve().parents[1]
public=['index.html','styles.css','modern.css','app.js','voice.js','data.js','.nojekyll']
public += [str(p.relative_to(root)).replace('\\','/') for p in (root/'assets').rglob('*') if p.is_file() and p.name!='department-logo-original.png']
source=public+['README.md','package.json','.gitignore']
source += [str(p.relative_to(root)).replace('\\','/') for folder in ['content','scripts','tests','.github'] for p in (root/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts]
for name, files in [('procurement-site.zip',public),('procurement-source.zip',source)]:
    with ZipFile(root/name,'w',ZIP_DEFLATED) as z:
        for filename in files:z.write(root/filename,filename)
    print(name,len(files),'files')
stage=root/'.qa'/'host'/'procurement'
stage.mkdir(parents=True,exist_ok=True)
for filename in public:
    (stage/filename).parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(root/filename,stage/filename)
print('Subpath QA staging:',stage)
