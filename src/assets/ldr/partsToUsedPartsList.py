import shutil
import os
import sys

#copy model.ldr file here in this directory
# sys.argv[1] should be model.ldr
# py partsToUsedPartsList.py model.ldr

#TODO: if line doesnt start with 1 in top file remove it

alreadyParts = []
newParts = []
submodels = []


with open("lists/usedPartsList.txt", 'r', encoding="utf8") as partsFile:
    for line in partsFile:
        mappedPart = line.replace("\n", "").replace("\r", "").replace("\t", "")
        alreadyParts.append(mappedPart)
print("AlreadyParts read with total entries: "+str(len(alreadyParts)))
    
def collectParts(filepath):
    with open(filepath, 'r', encoding="utf8") as file:
        for line in file:
            if line.startswith("1"):
                referenceName = line.split(" ", 14)[-1].replace("\n", "").replace("\r", "")
                referenceNameSplit = referenceName.split("\\")[-1]
                if not referenceName in alreadyParts:
                    newParts.append(referenceName)
                    print("Found: "+referenceName)
                else:
                    continue
            elif line.startswith("0 FILE"):
                submodelName = line.split(" ", 2)[-1].replace("\n", "").replace("\r", "")
                submodels.append(submodelName.lower())


collectParts(sys.argv[1])

newLines = []
for part in newParts:
    if not part in submodels and not part in newLines:
        newLines.append(part)
        print("Added: "+part)

with open("lists/usedPartsList.txt", 'a', encoding="utf8") as partsFile:
    partsFile.write("\n".join(newLines))

print("Finished! With "+ str(len(newLines))+ " parts added!")