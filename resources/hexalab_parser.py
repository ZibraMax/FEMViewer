import json
with open("dragon.txt") as f:
    n = f.readline()
    n = f.readline()
    n = f.readline()
    n = f.readline()
    n = int(f.readline())
    coords = []
    for i in range(n):
        coord = [float(i) for i in f.readline().strip().split()[:-1]]
        coords.append(coord)
    f.readline()
    ne = int(f.readline())
    dicc = []
    for i in range(ne):
        index = [int(i)-1 for i in f.readline().strip().split()[:-1]]
        dicc.append(index)

    obj = {"nodes": coords,
           "dictionary": dicc,
           "types": ["B1V"]*ne,
           "regions": [],
           "ebc": [],
           "nbc": [],
           "nvn": 1,
           "ngdl": n,
           "holes": [],
           "fillets": []}
    with open("salida.json", "w") as fw:
        fw.write(json.dumps(obj))
