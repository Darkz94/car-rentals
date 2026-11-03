
/* Local vector artworks: reusable vehicle styles and Cape Town sunset showroom. */
function createCapeCarArt(kind){
 const specs={
 hatch:{c:'#1bb6c5',roof:'hatch',accent:'#c1f6f5'},
 sedan:{c:'#386ec9',roof:'sedan',accent:'#b6dcff'},
 coupe:{c:'#ad58d6',roof:'sport',accent:'#f5cfff'},
 bakkie:{c:'#d5ad57',roof:'pickup',accent:'#fff1b8'},
 truck:{c:'#c1d7e4',roof:'truck',accent:'#ffffff'},
 bus:{c:'#ec8945',roof:'bus',accent:'#ffe5c6'},
 sport:{c:'#f05055',roof:'sport',accent:'#ffd7d7'},
 super:{c:'#ffb51b',roof:'super',accent:'#fff1b5'},
 hyper:{c:'#2d92e5',roof:'hyper',accent:'#c2efff'}
 };
 const p=specs[kind]||specs.sedan;
 const roof={
 hatch:'M238 304 L254 266 Q277 232 330 230 L495 230 Q558 233 613 305 Z',
 sedan:'M248 304 L278 264 Q312 221 370 217 L520 217 Q576 225 640 305 Z',
 sport:'M260 306 L323 268 Q379 241 461 240 L536 246 Q584 255 644 306 Z',
 super:'M253 309 L341 276 Q397 251 502 252 L555 264 Q587 273 628 309 Z',
 hyper:'M243 315 L342 283 Q408 247 514 253 L564 271 Q610 282 644 315 Z',
 pickup:'M426 307 L446 264 Q470 236 510 235 L595 235 Q622 244 650 306 Z',
 truck:'M433 307 L453 247 L583 245 Q617 258 649 306 Z',
 bus:'M241 306 L259 234 Q278 203 322 202 L616 202 Q650 219 666 306 Z'
 }[p.roof];
 const glass={
 hatch:'M272 284 L286 263 Q304 244 344 244 L485 244 Q544 253 573 284 Z',
 sedan:'M286 285 L306 259 Q329 235 379 232 L507 232 Q553 241 590 285 Z',
 sport:'M323 286 Q369 255 453 254 L523 258 Q551 264 583 286 Z',
 super:'M344 288 Q402 261 501 265 L544 278 L572 291 Z',
 hyper:'M354 294 Q421 264 505 268 L547 283 L566 294 Z',
 pickup:'M454 286 L466 259 Q483 246 516 247 L583 247 Q608 257 622 286 Z',
 truck:'M457 287 L468 257 L577 256 Q599 267 620 287 Z',
 bus:'M270 278 L281 230 Q299 213 328 213 L608 213 Q631 228 643 278 Z'
 }[p.roof];
 const detail=kind==='sport'||kind==='super'||kind==='hyper'
 ?'<path d="M169 325 L738 325" stroke="rgba(255,255,255,.20)" stroke-width="4"/>'
 :'<path d="M184 331 L752 331" stroke="rgba(255,255,255,.14)" stroke-width="3"/>';
 const bed=kind==='bakkie'||kind==='truck'
 ?'<path d="M184 298 L421 298 L421 320 L175 320" fill="#142334" opacity=".87"/><path d="M189 304 H419" stroke="#edf5ff" stroke-width="4" opacity=".65"/>':'';
 const doors=kind==='bus'
 ?'<path d="M446 287 L452 362 M550 286 L559 362" stroke="#091b29" stroke-width="3" opacity=".6"/>'
 :'<path d="M443 293 L454 365" stroke="#091b29" stroke-width="3" opacity=".55"/><path d="M461 309 L477 309" stroke="#f0f8ff" stroke-width="5" stroke-linecap="round" opacity=".8"/>';
 const svg=\`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="510" viewBox="0 0 1000 510" role="img" aria-label="\${kind} vehicle at Cape Town showroom">
 <defs>
  <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#101e3d"/><stop offset=".54" stop-color="#33617d"/><stop offset=".91" stop-color="#e5a478"/></linearGradient>
  <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#263c52"/><stop offset="1" stop-color="#101c2b"/></linearGradient>
  <linearGradient id="paint" x1="0" y1="0" x2="0" y2="1"><stop stop-color="\${p.accent}"/><stop offset=".18" stop-color="\${p.c}"/><stop offset=".61" stop-color="\${p.c}"/><stop offset="1" stop-color="#1b2e48"/></linearGradient>
  <linearGradient id="windows" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#c3ebff"/><stop offset=".25" stop-color="#53859e"/><stop offset=".75" stop-color="#182b44"/><stop offset="1" stop-color="#0c1b30"/></linearGradient>
  <radialGradient id="glow"><stop stop-color="#ffd6a6" stop-opacity=".8"/><stop offset="1" stop-color="#ffd5a6" stop-opacity="0"/></radialGradient>
  <filter id="shadow"><feGaussianBlur stdDeviation="9"/></filter>
 </defs>
 <rect width="1000" height="510" fill="url(#sky)"/>
 <circle cx="754" cy="117" r="192" fill="url(#glow)"/><circle cx="754" cy="117" r="27" fill="#ffdaaa" opacity=".85"/>
 <path d="M0 258 L77 243 L144 203 L198 200 L234 138 L421 138 L443 184 L485 179 L533 221 L588 232 L647 207 L712 232 L766 218 L823 257 L1000 250 L1000 350 L0 350Z" fill="#263e51"/>
 <path d="M0 293 L165 276 L242 261 L390 258 L491 269 L612 250 L741 272 L1000 248 L1000 354 L0 354Z" fill="#1a3246" opacity=".87"/>
 <path d="M0 324 Q240 297 430 318 Q665 306 1000 316 L1000 361 L0 361Z" fill="#577b83" opacity=".36"/>
 <path d="M700 297 L700 231 M760 303 L760 207 M828 308 L828 222 M899 306 L899 242" stroke="#173548" stroke-width="14" opacity=".55"/>
 <path d="M690 239 L711 239 L706 218 L695 218 Z M744 225 L776 225 L762 198 Z M815 238 L840 238 L837 219 L824 218Z" fill="#19384d" opacity=".7"/>
 <path d="M0 345 L1000 338 L1000 510 L0 510Z" fill="url(#ground)"/>
 <path d="M0 447 L1000 380 M0 508 L1000 404" stroke="#93bed4" stroke-width="2" opacity=".12"/>
 <path d="M15 490 L1000 421 M35 421 L990 373" stroke="#f3f8ff" stroke-width="3" opacity=".09"/>
 <ellipse cx="477" cy="401" rx="348" ry="54" fill="#000d1b" opacity=".65" filter="url(#shadow)"/>
 <ellipse cx="470" cy="405" rx="343" ry="49" fill="#7bbad0" opacity=".15"/>
 <g>
 <path d="M158 341 Q150 321 166 305 L203 300 L250 302 \${roof.slice(1)} L698 304 Q754 307 779 332 L797 350 Q802 364 792 375 L167 375 Q148 369 158 341Z" fill="url(#paint)" stroke="\${p.accent}" stroke-opacity=".6" stroke-width="3"/>
 \${bed}
 <path d="\${roof}" fill="url(#paint)" stroke="#cceaff" stroke-opacity=".42" stroke-width="3"/>
 <path d="\${glass}" fill="url(#windows)" stroke="#b6ddf4" stroke-width="3" stroke-opacity=".65"/>
 <path d="M446 252 L455 293" stroke="#0b1b31" stroke-width="6" opacity=".7"/>
 <path d="M282 313 Q429 306 642 317 L771 337" stroke="#ffffff" opacity=".45" stroke-width="4" fill="none"/>
 <path d="M169 357 Q439 346 786 358" stroke="#0a1b32" opacity=".6" stroke-width="11" fill="none"/>
 \${detail}\${doors}
 <path d="M771 324 L786 337 L786 348 L755 348 Q746 336 754 329 Z" fill="#fff8db"/>
 <path d="M766 333 L792 341" stroke="#fff9d7" stroke-width="5" opacity=".85"/>
 <path d="M167 328 L179 322 L181 346 L163 348 Z" fill="#ff6b62"/>
 <ellipse cx="276" cy="375" rx="51" ry="55" fill="#050d18"/><ellipse cx="657" cy="375" rx="51" ry="55" fill="#050d18"/>
 <circle cx="276" cy="375" r="36" fill="#202e3f" stroke="#647d90" stroke-width="4"/><circle cx="657" cy="375" r="36" fill="#202e3f" stroke="#647d90" stroke-width="4"/>
 <circle cx="276" cy="375" r="23" fill="#afc6d5"/><circle cx="657" cy="375" r="23" fill="#afc6d5"/>
 <path d="M276 353 L276 397 M255 375 H297 M260 359 L292 391 M260 391 L292 359 M657 353 L657 397 M635 375 H679 M641 359 L673 391 M641 391 L673 359" stroke="#263c50" stroke-width="7"/>
 <circle cx="276" cy="375" r="8" fill="#e5eef4"/><circle cx="657" cy="375" r="8" fill="#e5eef4"/>
 </g>
 <path d="M0 505 H1000" stroke="#f39d66" stroke-width="6" opacity=".4"/>
 <text x="26" y="45" font-family="Arial,sans-serif" font-size="15" font-weight="700" letter-spacing="3" fill="#eaf6ff" opacity=".8">CAPE TOWN / PREMIUM FLEET</text>
 <circle cx="955" cy="35" r="5" fill="#ffbd70"/><circle cx="939" cy="35" r="5" fill="#ffbd70" opacity=".5"/>
 </svg>\`;
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
il=createCapeCarArt('hatch'); Rt=createCapeCarArt('bakkie'); Rn=createCapeCarArt('sport'); So=createCapeCarArt('super'); Sc=createCapeCarArt('hyper');
