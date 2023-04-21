import shutil
import os
import sys

# py usedPartsListApplier.py

#TODO: if line doesnt start with 1 in top file remove it <-??

printedDict = {}
with open("lists/mappedPrintedList.txt", 'r', encoding="utf8") as mapfile:
    for line in mapfile:
        mappedPart = line.replace("\n", "").replace("\r", "").replace("\t", "").split(",")
        printedDict[mappedPart[0]] = mappedPart[1]
print("PrintedMapperFile read with total entries: "+str(len(printedDict.keys())))


def addPart(filename):
    print("Looking at: "+filename+" length: "+str(len(filename)))
    filenameSplit = filename.split("\\")[-1]
    if filename.startswith("48\\") and not os.path.exists(os.path.join("usedparts","p","48", str(filenameSplit))):
        with open("origParts/p/48/"+filenameSplit, 'r', encoding="utf8") as file:
            for line in file:
                if line.startswith("1"):
                    addPart(line.split(" ", 14)[-1].replace("\n", "").replace("\r", "").replace("\t", ""))
        shutil.copy2("origParts/p/48/"+filenameSplit, "usedParts/p/48/"+filenameSplit)
    elif filename.startswith("8\\") and not os.path.exists(os.path.join("usedparts","p","8", str(filenameSplit))):
        with open("origParts/p/8/"+filenameSplit, 'r', encoding="utf8") as file:
            for line in file:
                if line.startswith("1"):
                    addPart(line.split(" ", 14)[-1].replace("\n", "").replace("\r", "").replace("\t", ""))
        shutil.copy2("origParts/p/8/"+filenameSplit, "usedParts/p/8/"+filenameSplit)
    elif filename.startswith("s\\") and not os.path.exists(os.path.join("usedparts","parts","s", str(filenameSplit))):
        with open("origParts/parts/s/"+filenameSplit, 'r', encoding="utf8") as file:
            for line in file:
                if line.startswith("1"):
                    addPart(line.split(" ", 14)[-1].replace("\n", "").replace("\r", "").replace("\t", ""))
        shutil.copy2("origParts/parts/s/"+filenameSplit, "usedParts/parts/s/"+filenameSplit)
    elif filename in printedDict and os.path.exists(os.path.join("origparts","parts", printedDict[filename])) and not os.path.exists(os.path.join("usedparts","parts", printedDict[filename])):
                    # todo printed s\ und p\ ? 
        with open("origParts/parts/"+printedDict[filename], 'r', encoding="utf8") as file:
            for line in file:
                if line.startswith("1"):
                    addPart(line.split(" ", 14)[-1].replace("\n", "").replace("\r", "").replace("\t", ""))
        shutil.copy2("origParts/parts/"+printedDict[filename], "usedParts/parts/"+printedDict[filename])
    elif os.path.exists(os.path.join("origparts","p", str(filenameSplit))) and not os.path.exists(os.path.join("usedparts","p", str(filenameSplit))):
        with open("origParts/p/"+filenameSplit, 'r', encoding="utf8") as file:
            for line in file:
                if line.startswith("1"):
                    addPart(line.split(" ", 14)[-1].replace("\n", "").replace("\r", "").replace("\t", ""))
        shutil.copy2("origParts/p/"+filenameSplit, "usedParts/p/"+filenameSplit)
    elif os.path.exists(os.path.join("origparts","parts",str(filenameSplit))) and not os.path.exists(os.path.join("usedparts","parts", str(filenameSplit))):
        with open("origParts/parts/"+filenameSplit, 'r', encoding="utf8") as file:
            for line in file:
                if line.startswith("1"):
                    addPart(line.split(" ", 14)[-1].replace("\n", "").replace("\r", "").replace("\t", ""))
        shutil.copy2("origParts/parts/"+filenameSplit, "usedParts/parts/"+filenameSplit)
    else:
        print("Skipped: "+filename)
        return
    print("Resolved: "+filename)


with open("lists/usedPartsList.txt", 'r', encoding="utf8") as partsFile:
    for line in partsFile:
        mappedPart = line.replace("\n", "").replace("\r", "").replace("\t", "").strip()
        addPart(mappedPart)

print("Finished!")