# flosrocketbricks
This is the repository for https://flosrocketbricks.com .
The website is made using Angular and deployed on cloudflare pages.
Using Angular Universal it gets pre rendered at each deployment.

## How To Add A MOC
1. upload images to bricksafe
2. download low qual cover image into correct src/assets/mocImages folder
3. put data into flosrocketcreator
4. Add MOC json to src/assets/mocs.json
5. Add "/moc/:id" entry to routes.txt
7. Add the path & image to the sitemap
6. Commit & Push