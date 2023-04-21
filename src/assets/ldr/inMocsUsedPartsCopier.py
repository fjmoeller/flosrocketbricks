import shutil
import os
import sys

#copy model.ldr file here in this directory
# sys.argv[1] should be model.ldr
# py inMocsUsedPartsCopier.py model.ldr

printedDict = {}
with open("lists/mappedPrintedList.txt", 'r', encoding="utf8") as mapfile:
    for line in mapfile:
        mappedPart = line.replace("\n", "").replace("\r", "").replace("\t", "").split(",")
        printedDict[mappedPart[0]] = mappedPart[1]
print("PrintedMapperFile read with total entries: "+str(len(printedDict.keys())))

def addPart(filepath):
    with open(filepath, 'r', encoding="utf8") as file:
        for line in file:
            if line.startswith("1"):
                referenceName = line.split(" ", 14)[-1].replace("\n", "").replace("\r", "")
                referenceNameSplit = referenceName.split("\\")[-1]
                if referenceName.startswith("48\\") and not os.path.exists(os.path.join("usedparts","p","48", str(referenceNameSplit))):
                    addPart("origParts/p/48/"+referenceNameSplit)
                    shutil.copy2("origParts/p/48/"+referenceNameSplit, "usedParts/p/48/"+referenceNameSplit)
                elif referenceName.startswith("8\\") and not os.path.exists(os.path.join("usedparts","p","8", str(referenceNameSplit))):
                    addPart("origParts/p/8/"+referenceNameSplit)
                    shutil.copy2("origParts/p/8/"+referenceNameSplit, "usedParts/p/8/"+referenceNameSplit)
                elif referenceName.startswith("s\\") and not os.path.exists(os.path.join("usedparts","parts","s", str(referenceNameSplit))):
                    addPart("origParts/parts/s/"+referenceNameSplit)
                    shutil.copy2("origParts/parts/s/"+referenceNameSplit, "usedParts/parts/s/"+referenceNameSplit)
                elif referenceName in printedDict and os.path.exists(os.path.join("origparts","parts", printedDict[referenceName])) and not os.path.exists(os.path.join("usedparts","parts", printedDict[referenceName])):
                    # todo printed s\ und p\ ? 
                    addPart("origParts/parts/"+printedDict[referenceName])
                    shutil.copy2("origParts/parts/"+printedDict[referenceName], "usedParts/parts/"+printedDict[referenceName])
                elif os.path.exists(os.path.join("origparts","p", str(referenceNameSplit))) and not os.path.exists(os.path.join("usedparts","p", str(referenceNameSplit))):
                    addPart("origParts/p/"+referenceNameSplit)
                    shutil.copy2("origParts/p/"+referenceNameSplit, "usedParts/p/"+referenceNameSplit)
                elif os.path.exists(os.path.join("origparts","parts", str(referenceNameSplit))) and not os.path.exists(os.path.join("usedparts","parts", str(referenceNameSplit))):
                    addPart("origParts/parts/"+referenceNameSplit)
                    shutil.copy2("origParts/parts/"+referenceNameSplit, "usedParts/parts/"+referenceNameSplit)
                else:
                    print("Skipped: "+ referenceName)
                    continue
                print("Copied: "+referenceName )

addPart(sys.argv[1])
print ("Finished!")