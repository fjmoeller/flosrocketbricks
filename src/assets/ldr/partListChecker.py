# this script can be used to check whether an io file can be used to automatically create parts lists for bricklink and rebrickable from

from zipfile import ZipFile
import os
import json

printedDict = {}
manualMappedList = []

def searchPartsListJson(ldrawPartId,partsMappingJson):
    rParts = set()
    bParts = set()
    for partMapping in partsMappingJson:
        if ldrawPartId in partMapping["l"]:
            rParts.add(partMapping["r"])
            for bricklinkId in partMapping["b"]:
                bParts.add(bricklinkId)
    return (rParts,bParts)
    
def isPartInManualExportPartMappingList(mocPart):
    return mocPart in manualMappedList

#create dict of mappedPrintedList
with open("lists/mappedPrintedList.txt", 'r', encoding="utf8") as mapfile:
    for line in mapfile:
        mappedPart = line.replace("\n", "").replace("\r", "").replace("\t", "").split(",")
        printedDict[mappedPart[0]] = mappedPart[1]
print("PrintedMapperFile read with total entries: "+str(len(printedDict.keys())))

#create dict of manualExportPartMappingList
with open("lists/manualExportPartMappingList.json", 'r', encoding="utf8") as mapfile:
    partsmapping = json.load(mapfile)
    for mapping in partsmapping:
        manualMappedList.append(mapping["l"])
print("ManualExportPartMappingList read with total entries: "+str(len(manualMappedList)))


for mocfile in os.listdir(os.getcwd()):
    problemCounter = 0
    mocParts = set()
    if mocfile.endswith(".io"):
        customParts = 0
        print("io file "+mocfile)
        with ZipFile(os.path.join(os.getcwd(), mocfile), 'r') as iofile:
            iofile.extract("model.ldr", path=os.getcwd())
            with open("model.ldr", "r") as f:
                lines = f.readlines()
                skipcurrently = False
                for line in lines:
                    if skipcurrently: #currently skipping lines
                        if "NOFILE" in line: #end of custom hose or string
                            skipcurrently = False
                        continue
                    if line[0] == "1" and line.strip().endswith(".dat"): #normal line to work with
                        mocParts.add(line.split(".dat")[0].split(" ")[-1])
                    if line[2:8] == "String" or line[2:6] == "Hose": # start of custom hose or string -> skip following lines
                        skipcurrently = True
                        customParts += 1
            os.remove("model.ldr")
        with open("lists/parts-list.json","r") as partsmappingfile:
            partsmapping = json.load(partsmappingfile)
            #print("Checking a total of "+ str(len(mocParts))+ " parts against a total of "+str(len(partsmapping))+" mappings")
            for mocPart in mocParts:
                partMappings = searchPartsListJson(mocPart,partsmapping) #search if part is in json
                if len(partMappings[0])==1 and len(partMappings[1])==1: #everything good, easy mapping
                    continue
                if isPartInManualExportPartMappingList(mocPart): #check if manualExportPartMappingList file has defined on what to choose
                    continue
                if len(partMappings[0])>=1 or len(partMappings[1])>=1:
                    print("Problem found with Part l:" +mocPart+ " r:" +str(partMappings[0])+ " b:" +str(partMappings[1]))
                    problemCounter += 1
                else: #one of the mappings is at an amount of 0, if both are 0 then studio probably saved the bricklink id instead of the ldraw id...
                    #now check if it's part of the printed parts map
                    if mocPart+".dat" in printedDict: #if it's in the printed list -> mocPart is actually a bricklink id
                        actualLdrawPart = printedDict[mocPart+".dat"]
                        actualPartMappings = searchPartsListJson(actualLdrawPart,partsmapping)
                    else:
                        print("Problem found with Part l:" +mocPart+ " r:[] b:[]")
                        problemCounter += 1
        if customParts > 0:
            print("Warning: a total of "+str(customParts)+" custom parts found!")
        if problemCounter > 0:
            print("Total of " +str(problemCounter)+ " problems found!")
        else:
            print("No problems found!")