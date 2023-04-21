import sys
import os


found = 0
# sys.argv[1] should be the notneeded1.ldr /parts/parts
# sys.argv[2] should be the target folder /lists
# py printPartMapper.py origparts/parts lists/mappedPrintedList.txt

res = "";

for filename in os.listdir(sys.argv[1]):
    if(filename.endswith(".dat")):
        with open(os.path.join(sys.argv[1], filename), 'r', encoding="utf8") as file:
            part = ""
            for line in file:
                if line.startswith("0 Name:"):
                    splitted = line.split(" ")
                    part = splitted[2].replace('\n', '').replace('\r', '')
                elif line.startswith("0 !KEYWORDS"):
                    splitted = line.split(" ")
                    try:
                        value_index = splitted.index("Bricklink")+1
                        partAlt = splitted[value_index].replace(',', '').replace('\n', '').replace('\r', '')
                        res += partAlt + ".dat," + part + "\n"
                        found += 1
                        print(str(found)+ " " + partAlt + "," + part)
                    except:
                        try:
                            value_index = splitted.index("BrickLink")+1
                            partAlt = splitted[value_index].replace(',', '').replace('\n', '').replace('\r', '')
                            res += partAlt + ".dat," + part + "\n"
                            found += 1
                            print(str(found)+ " " + partAlt + "," + part)
                        except:
                            continue
                        continue
                
                
                

f = open(sys.argv[2], "w")
f.write(res)
f.close()

print("Finished! A total of "+str(found)+" part mappings have been detected")