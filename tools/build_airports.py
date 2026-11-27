"""Genera public/airports.csv con TODOS los aeropuertos con IATA de OpenFlights.
Uso: python3 tools/build_airports.py airports-extended.dat   (formato OpenFlights)
Formato de salida: IATA,lat,lon,ciudad,país,nombre,ICAO,zona_horaria
Conserva ciudades/países ya existentes (p. ej. ciudades en español) y añade o completa el resto."""
import csv,sys
cur={}
for r in csv.reader(open('public/airports.csv',encoding='utf-8')):
    if len(r)>=5: cur[r[0]]=r
out={}
def clean(x): return (x or '').replace(',',' ').replace('\\N','').strip()
for r in csv.reader(open(sys.argv[1],encoding='utf-8')):
    if len(r)<12: continue
    iata=r[4]
    if len(iata)!=3 or not iata.isalpha() or not iata.isupper(): continue
    try: lat,lon=float(r[6]),float(r[7])
    except ValueError: continue
    old=cur.get(iata)
    city=old[3] if old else clean(r[2]) or clean(r[1])
    ctry=old[4] if old else clean(r[3])
    icao=clean(r[5]); icao=icao if len(icao)==4 and icao.isalnum() else ''
    out[iata]=[iata,old[1] if old else f'{lat:.2f}',old[2] if old else f'{lon:.2f}',city,ctry,clean(r[1]),icao,clean(r[11])]
for k,old in cur.items():      # por si alguno no está en el origen
    if k not in out: out[k]=old[:5]+['','','']
with open('public/airports.csv','w',encoding='utf-8',newline='\n') as f:
    for k in out: f.write(','.join(out[k])+'\n')
print(len(out),'aeropuertos')
