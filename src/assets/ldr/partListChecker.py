from zipfile import ZipFile
import os
import json


printedDict = {}
with open("lists/mappedPrintedList.txt", 'r', encoding="utf8") as mapfile:
    for line in mapfile:
        mappedPart = line.replace("\n", "").replace("\r", "").replace("\t", "").split(",")
        printedDict[mappedPart[0]] = mappedPart[1]
print("PrintedMapperFile read with total entries: "+str(len(printedDict.keys())))


for mocfile in os.listdir(os.getcwd()):
    problems = 0
    ldrawparts = set()
    if mocfile.endswith(".io"):
        print("io file "+mocfile)
        with ZipFile(os.path.join(os.getcwd(), mocfile), 'r') as iofile:
            iofile.extract("model.ldr", path=os.getcwd())
            with open("model.ldr", "r") as f: # collect all parts fro mthe io file
                lines = f.readlines()
                for line in lines:
                    if line[0] == "1" and line.strip().endswith(".dat"):
                        ldrawparts.add(line.split(".dat")[0].split(" ")[-1])
            os.remove("model.ldr")
        with open("lists/parts-list.json","r") as partsmappingfile:
            partsmapping = json.load(partsmappingfile)
            print("Checking a total of "+ str(len(ldrawparts))+ " parts against a total of "+str(len(partsmapping))+" mappings")
            for ldrawpart in ldrawparts:
                rParts = []
                bParts = []
                for partmap in partsmapping:
                    if ldrawpart in partmap["l"]:
                        rParts.append(partmap["r"])
                        bParts.extend(partmap["b"])
                #check if part is inside a flex hose (as a subpart) -> then dont add it
                #
                if len(rParts)!=1 and len(bParts)!=1:
                    # check if it's part of the printed parts map
                    if ldrawpart+".dat" in printedDict: #if it's in the printed list -> ldrawpart is actually a bricklink id
                        print("Print found!")
                        actualLdrawPart = printedDict[ldrawpart+".dat"]
                        for partmap in partsmapping:
                            if actualLdrawPart in partmap["l"]: #printedDict[ldrawpart] is the actual ldraw id, so repeat the serach usign it
                                rParts.append(partmap["r"])
                                bParts.extend(partmap["b"])
                    else:
                        print("Problem found with Part l:" +ldrawpart+ " r:" +str(rParts)+ " b:" +str(bParts))
                        problems += 1
        if problems > 0:
            print("Total of " +str(problems)+ " problems found!")
        else:
            print("No problems found!")