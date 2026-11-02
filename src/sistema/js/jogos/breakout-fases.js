/* Desenhos próprios: cada fase tem uma geometria, resistências e caminhos diferentes. */
const marcar = (s) => s;
const cor = (x, y) => 'abcdef'[(x + y) % 6];
const fase = (nome, tema, desenho) => ({ nome, tema, mapa: Array.from({ length: 8 }, (_, y) => Array.from({ length: 12 }, (_, x) => desenho(x, y)).join('')) });

export const FASES = [
  fase(marcar('Primeiro contato'), 0, (x, y) => y < 5 && x % 4 !== 3 ? cor(x, y) : '.'),
  fase(marcar('Escadaria'), 1, (x, y) => y >= 6 - Math.floor(x / 2) && y < 7 ? cor(x, y) : '.'),
  fase(marcar('Coração de pixels'), 2, (x, y) => ['.aaa....aaa.', 'aaaaa..aaaaa', 'aaaaaaaaaaaa', '.aaaaaaaaaa.', '..aaaaaaaa..', '...aaaaaa...', '....aaaa....', '.....aa.....'][y][x]),
  fase(marcar('Fortaleza'), 3, (x, y) => [1, 10].includes(x) && y > 1 && y < 6 ? '#' : y < 6 && (y % 2 === 0 || x % 3 === 0) ? (y === 0 ? '2' : cor(x, y)) : '.'),
  fase(marcar('Órbita'), 0, (x, y) => { const d = ((x - 5.5) / 5) ** 2 + ((y - 3.5) / 3.2) ** 2; return d > 0.35 && d < 1.3 ? cor(x, y) : '.'; }),
  fase(marcar('Dinamite'), 2, (x, y) => y % 2 === 0 && x % 3 !== 2 ? (x % 3 === 1 ? '*' : '2') : '.'),
  fase(marcar('Túneis'), 1, (x, y) => [3, 8].includes(x) && y > 1 && y < 6 ? '#' : y % 2 === 0 || x % 2 === 0 ? cor(x, y) : '.'),
  fase(marcar('Duas torres'), 3, (x, y) => (x >= 1 && x <= 3 || x >= 8 && x <= 10) && y < 7 ? (y % 3 === 0 ? '2' : cor(x, y)) : '.'),
  fase(marcar('Zigue-zague'), 2, (x, y) => (x + y * 2) % 8 < 4 ? cor(x, y) : '.'),
  fase(marcar('Jardim elétrico'), 1, (x, y) => y === 3 && x % 3 === 1 ? '*' : (x + y) % 3 === 0 || y === 0 ? cor(x, y) : '.'),
  fase(marcar('Ponte de aço'), 0, (x, y) => y === 4 && ![2, 3, 8, 9].includes(x) ? '#' : y < 4 && x > 0 && x < 11 ? (y === 0 ? '2' : cor(x, y)) : '.'),
  fase(marcar('Ampulheta'), 3, (x, y) => Math.abs(x - 5.5) <= Math.abs(y - 3.5) + 1 ? (y === 3 || y === 4 ? '*' : cor(x, y)) : '.'),
  fase(marcar('Passagens secretas'), 0, (x, y) => x % 4 === 1 && y > 0 && y < 5 ? '#' : y % 2 === 0 || x % 4 === 3 ? (x % 4 === 3 ? '2' : cor(x, y)) : '.'),
  fase(marcar('Chuva de estrelas'), 2, (x, y) => (x + y * 3) % 7 < 3 ? ((x + y) % 5 === 0 ? '*' : cor(x, y)) : '.'),
  fase(marcar('Circuito'), 1, (x, y) => y === 3 && [2, 5, 8].includes(x) ? '#' : y === 1 || y === 6 || x % 3 === y % 3 ? (y === 1 ? '2' : cor(x, y)) : '.'),
  fase(marcar('Pirâmide invertida'), 3, (x, y) => Math.abs(x - 5.5) <= 5.5 - y * 0.7 ? (y < 2 ? '2' : cor(x, y)) : '.'),
  fase(marcar('Mosaico'), 2, (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0 ? (x % 3 === 1 && y % 2 === 0 ? '3' : cor(x, y)) : '.'),
  fase(marcar('Cascata'), 0, (x, y) => (x - y + 12) % 6 < 3 ? (y === 0 || y === 7 ? '*' : cor(x, y)) : '.'),
  fase(marcar('Reator'), 3, (x, y) => [1, 10].includes(x) && y > 1 && y < 6 ? '#' : Math.abs(x - 5.5) + Math.abs(y - 3.5) < 5 ? (x === 5 || x === 6 ? '*' : '2') : '.'),
  fase(marcar('Onda quadrada'), 1, (x, y) => (x % 4 < 2 ? y < 3 || y === 6 : y > 3 || y === 1) ? cor(x, y) : '.'),
  fase(marcar('Constelação'), 0, (x, y) => (x * 3 + y * 5) % 11 < 4 ? ((x + y) % 4 === 0 ? '3' : cor(x, y)) : '.'),
  fase(marcar('Muralha'), 3, (x, y) => y < 6 && x % 4 !== 3 ? (y % 2 === 0 ? '3' : x % 4 === 1 ? '*' : '2') : '.'),
  fase(marcar('Última órbita'), 2, (x, y) => { const d = Math.abs(x - 5.5) + Math.abs(y - 3.5); return d < 2 ? '*' : d < 5 ? '2' : d < 6 ? cor(x, y) : '.'; }),
  fase(marcar('Grande final'), 1, (x, y) => y === 4 && [1, 4, 7, 10].includes(x) ? '#' : y % 3 === 1 ? (x % 3 === 1 ? '*' : '3') : (x + y) % 2 === 0 ? cor(x, y) : '2'),
];
