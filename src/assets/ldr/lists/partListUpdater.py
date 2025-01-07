# This script updates the partList using the rebrickable api

import requests
import json
import time

api_key = ""
api_link = "https://rebrickable.com/api/v3/lego/parts/"
not_allowed_part_cats = [66,58,17,48,42,50,24,62,63,64,57,43]

api_page_counter = 1
part_mappings = []

print("Downloading page "+str(api_page_counter))
response = requests.get(api_link,params={"key": api_key,"page":api_page_counter,"page_size":1000})

while response.status_code != 404:
    for part in json.loads(response.text)["results"]:
        if part["part_cat_id"] not in not_allowed_part_cats:

            rbrck_num = part["part_num"]

            brcklnk_num = ""
            if "BrickLink" in part["external_ids"]:
                brcklnk_num = '["'+'","'.join(part["external_ids"]["BrickLink"])+'"]'
            else:
                brcklnk_num = "[]"

            ldrw_num = ""
            if "LDraw" in part["external_ids"]:
                ldrw_num = '["'+'","'.join(part["external_ids"]["LDraw"])+'"]'
            else:
                ldrw_num = "[]"

            new_part = ','.join(['{"r":"'+rbrck_num+'"','"b":'+brcklnk_num,'"l":'+ldrw_num+'}\n'])
            part_mappings.append(new_part)

    time.sleep(1)
    api_page_counter += 1
    print("Downloading page "+str(api_page_counter))
    response = requests.get(api_link,params={"key": api_key,"page":api_page_counter,"page_size":1000})

#Finished downloading all the parts from rebrickable
with open("partList.json", "w") as f:
    f.write("["+",".join(part_mappings)+"]")

print("Finished with a part count of "+str(len(part_mappings)))
