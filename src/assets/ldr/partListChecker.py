# This script checks all .io files in the current directory and checks if all parts have mappings in order for the website export feature to be used

from zipfile import ZipFile
import os
import json


class PartMapping:
    b = []
    r = ""
    l = []

    def __init__(self, b, r, l):
        self.b = b
        self.r = r
        self.l = l


class PartMappingFix:
    b = ""
    r = ""
    l = ""

    def __init__(self, b, r, l):
        self.b = b
        self.r = r
        self.l = l


partList: list[PartMapping] = []
partListFix: dict[str, PartMappingFix] = {}

with open("lists/partList.json", 'r', encoding="utf8") as mappingFile:
    partMappings = json.load(mappingFile)
    for partMapping in partMappings:
        partList.append(PartMapping(partMapping["b"], partMapping["r"], partMapping["l"]))
print("PartList read with total entries: " + str(len(partList)))

with open("lists/partListFix.json", 'r', encoding="utf8") as mappingFile:
    partMappings = json.load(mappingFile)
    for partMapping in partMappings:
        partListFix[partMapping["io"]] = PartMappingFix(partMapping["b"], partMapping["r"], partMapping["l"])
print("PartListFix read with total entries: " + str(len(partListFix.keys())))


def isPartInPartList(part):
    for partMapping in partList:
        if part in partMapping.l:
            if len(partMapping.b) == 1:
                return 1
            elif len(partMapping.b) > 1:
                return len(partMapping.b)
            return 0
    return -1


for mocFile in os.listdir(os.getcwd()):
    problemCounter = 0
    mocParts = set()
    if mocFile.endswith(".io"):
        customParts = 0
        print("----Looking at io file " + mocFile+"----")
        with ZipFile(os.path.join(os.getcwd(), mocFile), 'r') as iofile:
            iofile.extract("model.ldr", path=os.getcwd())
            with open("model.ldr", "r") as f:
                lines = f.readlines()
                skipCurrently = False
                for line in lines:
                    if skipCurrently:  # currently skipping lines
                        if "NOFILE" in line:  # end of custom hose or string
                            skipCurrently = False
                        continue
                    if line[0] == "1" and line.strip().endswith(".dat"):  # normal line to work with
                        mocParts.add(line.split(".dat")[0].split(" ")[-1])
                    if line[2:8] == "String" or line[2:6] == "Hose":  # start of custom hose or string -> skip following lines
                        skipCurrently = True
                        customParts += 1
            os.remove("model.ldr")

        print("io file contains "+ str(len(mocParts))+ " parts")
        for mocPart in mocParts:
            if mocPart in partListFix and partListFix[mocPart].b != "" and partListFix[mocPart].r != "":
                continue
            partMapping = isPartInPartList(mocPart)  # search if part is in json
            if partMapping == 1:
                continue
            elif partMapping > 1:
                print("Problem found with Part l:" + mocPart + " b: " + str(partMapping))
                problemCounter += 1
            elif partMapping == 0:
                print("Problem found with Part l:" + mocPart + " r:{} b:{}")
                problemCounter += 1
            else:
                print("Problem found with Part l:" + mocPart + " not found")
                problemCounter += 1
        if customParts > 0:
            print("Warning: a total of " + str(customParts) + " custom parts found!")
        if problemCounter > 0:
            print("Total of " + str(problemCounter) + " problems found!")
        else:
            print("No problems found!")
