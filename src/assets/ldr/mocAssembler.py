import shutil
import os
import sys
import json
from zipfile import ZipFile


class PartMapping:
  actualLdrawId = []
  r = ""
  def __init__(self, actualLdrawId, r):
    self.actualLdrawId = actualLdrawId
    self.r = r

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

partList: dict[str,PartMapping] = {}
with open("lists/partList.json", 'r', encoding="utf8") as partListJson:
  partListDict = json.load(partListJson)
  for partMapping in partListDict:
    for fakeLDrawId in partMapping["b"]:
      partList[fakeLDrawId] = PartMapping(partMapping["l"],partMapping["r"])
print("PartList read with total entries: " + str(len(partList.keys())))
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
        referenceName = line.split(" ", 14)[-1].replace("\n", "").replace("\r", "")
        referenceNameSplit = referenceName.split("\\")[-1]
        if not referenceName in parts:
          if referenceName.startswith("48\\"):
            parts[referenceName] = collectParts("/".join(["origparts", "p", "48", referenceNameSplit]))
            # print(" ".join(["Part added:",referenceName,"with a total amount of lines:",str(len(parts[referenceName]))]))
          elif referenceName.startswith("8\\"):
            parts[referenceName] = collectParts("/".join(["origparts", "p", "8", referenceNameSplit]))
            # print(" ".join(["Part added:",referenceName,"with a total amount of lines:",str(len(parts[referenceName]))]))
          elif referenceName.startswith("s\\"):
            parts[referenceName] = collectParts("/".join(["origparts", "parts", "s", referenceNameSplit]))
            # print(" ".join(["Part added:",referenceName,"with a total amount of lines:",str(len(parts[referenceName]))]))

          elif referenceName in partListFix and os.path.exists(
            os.path.join("origparts", "parts", partListFix[referenceName].l)):
            parts[referenceName] = collectParts("/".join(["origparts", "parts", partListFix[referenceName].l]))
          elif referenceName in partList and len(partList[referenceName].l) > 0 and os.path.exists(
            os.path.join("origparts", "parts", partList[referenceName].l[0])):
            parts[referenceName] = collectParts("/".join(["origparts", "parts", partList[referenceName].l[0]]))

          elif os.path.exists(os.path.join("origparts", "p", str(referenceNameSplit))):
            parts[referenceName] = collectParts("/".join(["origparts", "p", referenceNameSplit]))
            # print(" ".join(["Part added:",referenceName,"with a total amount of lines:",str(len(parts[referenceName]))]))
          elif os.path.exists(os.path.join("origparts", "parts", str(referenceNameSplit))):
            parts[referenceName] = collectParts("/".join(["origparts", "parts", referenceNameSplit]))
            # print(" ".join(["Part added:",referenceName,"with a total amount of lines:",str(len(parts[referenceName]))]))
          else:
            print("Part not found: " + referenceName)
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
