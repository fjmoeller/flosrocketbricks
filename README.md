# flosrocketbricks
This is the repository for https://flosrocketbricks.com .
The website is made using Angular and deployed on cloudflare pages.
Using Angular Universal it gets pre rendered at each deployment.

## How To Add A MOC
1. upload images to bricksafe
2. download low qual cover image into correct src/assets/mocImages folder
4. Add MOC json to src/assets/mocs.json
5. Add "/moc/:id" entry to routes.txt
6. Add "https://flosrocketbricks.com/moc/:id" entry to sitemap.txt
7. Add the path & image to the sitemap
8. For every io file: put model.ldr file into src/assets/ldr and run "py inMocsUsedPartsCopier.py model.ldr"
8. NEW: append every files model.ldr into totalModels.ldr and run "py inMocsUsedPartsCopier.py totalModels.ldr"
8. NEWNEW: For every io file: put model.ldr file into src/assets/ldr and run "py overCopier.py model.ldr" and then "py inMocsUsedPartsCopier.py totalModels.ldr"
9. In usedParts/parts run directoryListCreator.bat and copy the list.txt file into /lists as partsList.txt
10. In usedParts/p run directoryListCreator.bat and copy the list.txt file into /lists as primitiveList.txt
11. Commit & Push

## How To Update LDR Parts
1. Replace files in src/assets/origParts
2. run printPartMapper.py
3. put new LDConfig.ldr into /lists 