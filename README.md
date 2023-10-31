# flosrocketbricks
This is the repository for https://flosrocketbricks.com .
The website is made using Angular and deployed on cloudflare pages.
Using Angular Universal it gets pre rendered at each deployment.

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
2. run printPartMapper.py
3. put manual printed mapped parts into printed part map
4. put new LDConfig.ldr into /lists 