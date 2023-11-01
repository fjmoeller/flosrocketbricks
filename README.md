# flosrocketbricks

This is the repository for https://flosrocketbricks.com .
The website is made using Angular and deployed on cloudflare pages.
Using Angular Universal some pages get pre-rendered.

## How To Add A MOC
1. upload images to bricksafe/Bucket
2. download low qual cover image into correct src/assets/mocImages folder
4. Add MOC json to src/assets/mocs.json
5. Add "/moc/:id/:name/" entry to routes.txt
6. Add "https://flosrocketbricks.com/moc/:id/:name/" entry to sitemap.txt
7. Add the path & image to the sitemap
8. Commit & Push

## How To Update LDR Parts
1. Replace files in src/assets/origParts
2. run `py printPartMapper.py origparts/parts lists/mappedPrintedList.txt`
3. also put manual printed mapped parts into mappedPrintedList.txt
4. put new LDConfig.ldr into /lists 
### Current local part list is on this version: Parts Update 2023-05