"""Give every bullet character the Beamer bullet colour (pptxgenjs has no option for it)."""
import re, shutil, sys, tempfile, zipfile

src, color = sys.argv[1], sys.argv[2]
tmp = tempfile.mktemp(suffix=".pptx")
with zipfile.ZipFile(src) as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        data = zin.read(item.filename)
        if re.match(r"ppt/slides/slide\d+\.xml$", item.filename):
            x = data.decode("utf8")
            clr = f'<a:buClr><a:srgbClr val="{color}"/></a:buClr>'
            # buClr must come first among the bullet properties (before buSzPct/buFont/buChar)
            x = re.sub(r'(<a:buSzPct[^>]*/>)?(<a:buFont[^>]*/>)?(<a:buChar )', lambda m: clr + (m.group(1) or "") + (m.group(2) or "") + m.group(3), x)
            data = x.encode("utf8")
        zout.writestr(item, data)
shutil.move(tmp, src)
