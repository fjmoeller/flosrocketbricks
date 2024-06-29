# flosrocketbricks

This is the repository for https://flosrocketbricks.com .
The website is made using Angular and deployed on cloudflare pages.
Using Angular Universal some pages get pre-rendered.

## How To Add A MOC (a reminder for myself)
1. let all io file run through partListChecker and mocAssembler
2. upload images to bricksafe & Cloudfalre
3. download low quality cover image from bricksafe and put it into the src/assets/mocImages folder
4. Add MOC to src/assets/mocs.json
5. Add "/moc/:id/:name/" entry to routes.txt
6. Add "https://flosrocketbricks.com/moc/:id/:name/" entry to sitemap.txt
7. Add the path & image to the sitemap

## How To Update LDR Parts (To be changed)
1. Replace files in src/assets/origParts
2. run `py printPartMapper.py origparts/parts lists/mappedPrintedList.txt`
3. also put manual printed mapped parts into mappedPrintedList.txt
4. put new LDConfig.ldr into /lists 