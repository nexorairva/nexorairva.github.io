"""Convierte routes.dat de OpenFlights (CSV con cabecera) en public/routes.csv.
Quita las aerolíneas reales y deja pares únicos origen,destino,máscara de equipo
(1=A20N 2=A21N 4=B738 8=B789 16=E195).  Uso: python3 tools/build_routes.py data/routes_original.csv  (ejecutar antes tools/build_airports.py)"""
import csv,sys
M={}
def put(c,b):
    for x in c.split(): M[x]=b
put('320 32N 32S 32A 319 31N 318 31B',1);put('321 32B 32Q',2)
put('738 73H 73W 737 73G 73J 73C 739 73Y 7M8 7M9 733 734 735 736 73F 73R 73M 73X',4)
put('787 788 789 78X 332 333 330 359 351 358 763 764 767 772 773 77L 77W 777 744 748 388 343 346 345 342 340 310',8)
put('E90 E95 E70 E75 E7W E170 E190 E195 CR9 CRJ CR7 CR2 CR1 ERJ ER4 ER3 DH4',16)
p={}
for x in csv.DictReader(open(sys.argv[1],encoding='utf-8-sig')):
    a,b=x['Source Airport'],x['Destination Airport']
    if len(a)==3 and len(b)==3 and a!=b:
        m=p.get((a,b),0)
        for e in x['Equipment'].split(): m|=M.get(e,0)
        p[(a,b)]=m
# solo rutas cuyos dos aeropuertos tienen coordenadas en public/airports.csv
known={l.split(',')[0] for l in open('public/airports.csv',encoding='utf-8')}
n0=len(p);p={k:v for k,v in p.items() if k[0] in known and k[1] in known}
with open('public/routes.csv','w') as f:
    for (a,b),m in sorted(p.items()): f.write(f'{a},{b},{m}\n')
print(len(p),'rutas (descartadas %d sin coordenadas)'%(n0-len(p)))
