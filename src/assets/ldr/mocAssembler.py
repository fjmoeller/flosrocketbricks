import shutil
import os
import sys

parts = {}
submodels = []

printedDict = {}
with open("lists/mappedPrintedList.txt", 'r', encoding="utf8") as mapfile:
    for line in mapfile:
        mappedPart = line.replace("\n", "").replace("\r", "").replace("\t", "").split(",")
        printedDict[mappedPart[0]] = mappedPart[1]
print("PrintedMapperFile read with total entries: "+str(len(printedDict.keys())))

def collectParts(filepath):
    fileContent = []
    with open(filepath, 'r', encoding="utf8") as file:
        for line in file:
            fileContent.append(line)
            if line.startswith("1"):
                referenceName = line.split(" ", 14)[-1].replace("\n", "").replace("\r", "")
                referenceNameSplit = referenceName.split("\\")[-1]
                if not referenceName in parts:
                    if referenceName.startswith("48\\"):
                        parts[referenceName] = collectParts("/".join(["origparts","p","48",referenceNameSplit]))
                        #print(" ".join(["Part added:",referenceName,"with a total amount of lines:",str(len(parts[referenceName]))]))
                    elif referenceName.startswith("8\\"):
                        parts[referenceName] = collectParts("/".join(["origparts","p","8",referenceNameSplit]))
                        #print(" ".join(["Part added:",referenceName,"with a total amount of lines:",str(len(parts[referenceName]))]))
                    elif referenceName.startswith("s\\"):
                        parts[referenceName] = collectParts("/".join(["origparts","parts","s",referenceNameSplit]))
                        #print(" ".join(["Part added:",referenceName,"with a total amount of lines:",str(len(parts[referenceName]))]))
                    elif referenceName in printedDict and os.path.exists(os.path.join("origparts","parts", printedDict[referenceName])):
                        parts[referenceName] = collectParts("/".join(["origparts","parts",printedDict[referenceName]]))
                        #print(" ".join(["Part added:",referenceName,"with a total amount of lines:",str(len(parts[referenceName]))]))
                    elif os.path.exists(os.path.join("origparts","p", str(referenceNameSplit))):
                        parts[referenceName] = collectParts("/".join(["origparts","p",referenceNameSplit]))
                        #print(" ".join(["Part added:",referenceName,"with a total amount of lines:",str(len(parts[referenceName]))]))
                    elif os.path.exists(os.path.join("origparts","parts",str(referenceNameSplit))):
                        parts[referenceName] = collectParts("/".join(["origparts","parts",referenceNameSplit]))
                        #print(" ".join(["Part added:",referenceName,"with a total amount of lines:",str(len(parts[referenceName]))]))
                    else:
                        print("Part not found: "+referenceName)
                else:
                    continue
    return "".join(fileContent)


collectParts(sys.argv[1])

print("Total amount of "+str(len(parts))+ " parts found.")

actualParts = ["\n0 NOSUBMODEL\n"]
for part in parts:
    if not part in submodels:
        actualParts.append("0 FILE "+part+"\n") #todo is part right here?
        actualParts.append(parts[part])
        actualParts.append("0 NOFILE\n")
        print("Added: "+part+" to file")

with open(sys.argv[1], 'a', encoding="utf8") as ldrmoc:
    ldrmoc.write("\n".join(actualParts))