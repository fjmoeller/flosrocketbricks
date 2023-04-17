# flosrocketbricks
This is the repository for https://flosrocketbricks.com .
The website is made using Angular and deployed on cloudflare pages.
Using Angular Universal it gets pre rendered at each deployment.

## How To Add A MOC
1. upload images to bricksafe
2. download low qual cover image into correct src/assets/mocImages folder
4. Add MOC json to src/assets/mocs.json
5. Add "/moc/:id" entry to routes.txt
5. Add "https://flosrocketbricks.com/moc/:id" entry to sitemap.txt
7. Add the path & image to the sitemap
6. Commit & Push

## How To Update LDR Parts
1. Replace files
2. Check logs for new files and add the ones not needed to notneeded2.io REMOVE
3. extract notneeded1.ldr and notneeded2.ldr from their io files REMOVE
4. run "notneededRemover.py notneeded1.ldr" and "notneededRemover.py notneeded2.ldr" REMOVE AND REPLACE WITH PYTHON SCRIPT TO RESOLVE ALL PARTS
5. run "py printPartMapper.py parts/parts lists/mappedPrintedList.txt"
5. Run the directoryListCreator.bat script in the parts and the p directories
6. copy results into assets/ldr/lists