"""Completa public/airports.csv con TODOS los aeropuertos con IATA de OpenFlights.
Uso: python3 tools/build_airports.py airports-extended.dat   (formato OpenFlights)
Conserva las filas ya existentes (ciudades en español) y añade las que falten.
Formato de salida: IATA,lat,lon,ciudad,país"""
import csv,sys
src=sys.argv[1]
cur={}
for r in csv.reader(open('public/airports.csv',encoding='utf-8')):
    if len(r)>=5: cur[r[0]]=r
add=0
for r in csv.reader(open(src,encoding='utf-8')):
    if len(r)<8: continue
    iata=r[4]
    if len(iata)!=3 or not iata.isalpha() or not iata.isupper() or iata in cur: continue
    try: lat,lon=float(r[6]),float(r[7])
    except ValueError: continue
    city=(r[2] or r[1]).replace(',',' ').strip(); ctry=r[3].replace(',',' ').strip()
    cur[iata]=[iata,f'{lat:.2f}',f'{lon:.2f}',city,ctry]; add+=1
with open('public/airports.csv','w',encoding='utf-8',newline='\n') as f:
    for k in cur: f.write(','.join(cur[k])+'\n')
print(len(cur),'aeropuertos (+%d)'%add)
