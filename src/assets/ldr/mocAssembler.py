# This script tries creating an ldraw file that includes all the definitions for all the needed parts for this model for every .io file in the current directory

import shutil
import os
import sys
import json
from zipfile import ZipFile


class PartMapping:
  l = []
  def __init__(self, l):
    self.l = l

class PartMappingFix:
  b = ""
  r = ""
  l = ""
  def __init__(self, b, r,l):
    self.b = b
    self.r = r
    self.l = l


parts = {}
submodels = []

blIdPartList: dict[str,PartMapping] = {}
with open("lists/partList.json", 'r', encoding="utf8") as partListJson:
  partListDict = json.load(partListJson)
  for partMapping in partListDict:
    for fakeLDrawId in partMapping["b"]:
      blIdPartList[fakeLDrawId] = PartMapping(partMapping["l"])
print("PartList read with total entries: " + str(len(blIdPartList.keys())))

partListFix: dict[str,PartMapping] = {}
with open("lists/partListFix.json", 'r', encoding="utf8") as partListJson:
  partListDict = json.load(partListJson)
  for partMapping in partListDict:
    partListFix[partMapping["io"]] = PartMappingFix(partMapping["b"],partMapping["r"],partMapping["l"])
print("PartListFix read with total entries: " + str(len(partListFix.keys())))


def collectParts(filePath):
  fileContent = []
  with open(filePath, 'r', encoding="utf8") as file:
    for line in file:
      fileContent.append(line)
      if line.startswith("1"):
        partName = line.split(" ", 14)[-1].replace("\n", "").replace("\r", "")
        partNameSplit = partName.split("\\")[-1]
        partNameTrimmed = partNameSplit[0,-4]
        if not partName in parts:
          if partName.startswith("48\\"):
            parts[partName] = collectParts("/".join(["origparts", "p", "48", partNameSplit]))
          elif partName.startswith("8\\"):
            parts[partName] = collectParts("/".join(["origparts", "p", "8", partNameSplit]))
          elif partName.startswith("s\\"):
            parts[partName] = collectParts("/".join(["origparts", "parts", "s", partNameSplit]))

          elif partNameTrimmed in partListFix and os.path.exists(
            os.path.join("origparts", "parts", partListFix[partNameTrimmed].l)):
            parts[partName] = collectParts("/".join(["origparts", "parts", partListFix[partNameTrimmed].l+".dat"])) #TODO .dat richtig?

          elif os.path.exists(os.path.join("origparts", "p", str(partNameSplit))):
            parts[partName] = collectParts("/".join(["origparts", "p", partNameSplit]))
          elif os.path.exists(os.path.join("origparts", "parts", str(partNameSplit))):
            parts[partName] = collectParts("/".join(["origparts", "parts", partNameSplit]))
            #print(" ".join(["Part added:",referenceName,"with a total amount of lines:",str(len(parts[referenceName]))]))

          elif partNameTrimmed in blIdPartList and len(blIdPartList[partNameTrimmed].l) > 0 and os.path.exists(
            os.path.join("origparts", "parts", blIdPartList[partNameTrimmed].l[0])):
            parts[partName] = collectParts("/".join(["origparts", "parts", blIdPartList[partNameTrimmed].l[0]+".dat"])) #TODO .dat richtig?

          else:
            print("Part not found: " + partName)
        else:
          continue
  return "".join(fileContent)


if len(sys.argv) == 1 or sys.argv[1] == None or sys.argv[1] == "":
  current_dir = os.getcwd()
  for file in os.listdir(current_dir):
    if file.endswith(".io"):
      print("io file " + file)
      filepath = os.path.join(current_dir, file)
      with ZipFile(filepath, 'r') as zObject:
        zObject.extract("model.ldr", path=os.getcwd())
      collectParts("model.ldr")
      # print("Total amount of "+str(len(parts))+ " parts found.")
      actualParts = ["\n0 NOSUBMODEL\n"]
      for part in parts:
        if not part in submodels:
          actualParts.append("0 FILE " + part + "\n")  # todo is part correct here?
          actualParts.append(parts[part])
          actualParts.append("0 NOFILE\n")
          # print("Added: "+part+" to file")
      with open(file[:-2] + "ldr", 'a', encoding="utf8") as ldrmoc:
        with open("model.ldr", 'r', encoding="utf8") as origfile:
          ldrmoc.write(origfile.read() + "\n".join(actualParts))
      os.remove("model.ldr")
      parts = {}
      submodels = []
else:
  collectParts(sys.argv[1])
  actualParts = ["\n0 NOSUBMODEL\n"]
  for part in parts:
    if not part in submodels:
      actualParts.append("0 FILE " + part + "\n")  # todo is part correct here?
      actualParts.append(parts[part])
      actualParts.append("0 NOFILE\n")
      print("Added: " + part + " to file")

  with open(sys.argv[1], 'a', encoding="utf8") as ldrmoc:
    ldrmoc.write("\n".join(actualParts))
