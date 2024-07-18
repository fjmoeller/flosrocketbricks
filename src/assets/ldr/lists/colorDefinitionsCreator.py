#This file updates the color_definitions.json, which contains all the color information used for the 3d viewer
#How to use it: put the LDConfig.ldr from the newest release of ldraw into this folder and call this script 'py colorDefinitionsCreator.py'
#And then delete the LDConfig.ldr again

#parse LDConfig.ldr
#if line starts with 0 !COLOUR
#collapse spacesaaaa

colorDefs = []

with open("LDConfig.ldr", 'r', encoding="utf8") as mappingFile:
    lines = mappingFile.readlines()
    for line in lines:
        if line.startswith('0 !COLOUR'):
            splitLine = line.split()
            name = splitLine[2]
            code = int(splitLine[4])
            hex = splitLine[6]
            edge = splitLine[8]
            alpha = 255
            if "ALPHA" in splitLine:
                alpha = int(splitLine[splitLine.index("ALPHA")+1])
            luminance = 0
            if "LUMINANCE" in splitLine:
                luminance = int(splitLine[splitLine.index("LUMINANCE")+1])
            material = '""'
            if "CHROME" in splitLine:
                material = '"CHROME"'
            elif "PEARLESCENT" in splitLine:
                material = '"PEARLESCENT"'
            elif "METAL" in splitLine:
                material = '"METAL"'
            colorDefs.append('{"name":"'+name+'", "code":'+str(code)+', "hex":"'+hex+'", "edge":"'+edge+'", "alpha":'+str(alpha)+', "luminance":'+str(luminance)+', "material":'+material+'}')
    


#finished parsing color, now saving
with open("color_definitions.json", "w") as f:
    f.write("["+",\n".join(colorDefs)+"]")