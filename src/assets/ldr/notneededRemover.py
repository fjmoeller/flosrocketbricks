import sys
import os.path


removed = 0
notfound = 0
# sys.argv[1] should be the notneeded1.ldr
# sys.argv[2] should be the target folder
file = open(sys.argv[1],'r', encoding="utf8")
for line in file:
    if line.startswith("1"):
        line = line.strip(' \t\n\r')
        splitted = line.split(" ")
        if os.path.exists("parts/parts/"+splitted[-1]):
            os.remove("parts/parts/"+splitted[-1])
            #print("Removing: "+splitted[-1])
            removed += 1
        else:
            print("Part not found: "+"parts/parts/"+splitted[-1])
            notfound += 1
print("Finished!")
print("Removed:"+str(removed))
print("Not found:"+str(notfound))