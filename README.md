# Glass Studio

Editor web/PWA experimental de vidro líquido com renderização WebGL 2 e exportação PNG RGBA com fundo transparente.

## O que já funciona nesta primeira versão
- Interface adaptável para desktop e celular.
- PWA: pode ser publicada no GitHub Pages e adicionada à tela inicial do iPhone/Android.
- Importação de imagem PNG, JPG e WebP.
- Formas Squircle, círculo, retângulo arredondado e diamante.
- Ajustes de geometria, refração, distorção, desfoque, opacidade, brilho, ruído e tonalidade.
- Texto/logo simples sobre a forma.
- Exportação PNG em 2K, 3K ou 4K, com canal alfa.
- Ícone próprio em 192 e 512 px.

## Testar localmente
Não abra `index.html` diretamente com duplo clique: o modo PWA e o carregamento do service worker precisam de HTTP/HTTPS. A forma mais simples é usar a extensão **Live Server** do Visual Studio Code ou executar:

```bash
npx serve .
```

Depois abra o endereço local exibido pelo servidor.

## Publicar no GitHub Pages
1. Crie um repositório chamado `glass-studio`.
2. Envie todos os arquivos desta pasta para a raiz do repositório.
3. No GitHub, abra **Settings → Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)`.
5. Salve e aguarde a publicação.

## Instalar no iPhone
1. Abra o endereço HTTPS publicado no Safari.
2. Toque em Compartilhar.
3. Escolha **Adicionar à Tela de Início**.

No computador, navegadores compatíveis podem oferecer a opção de instalar o site pelo ícone na barra de endereço ou pelo menu.

## Sobre a transparência
A exportação gera PNG RGBA e limpa o canvas antes de desenhar a camada de vidro. Os pixels fora da forma são transparentes; o quadriculado é apenas a visualização da transparência e não é exportado. A imagem importada é amostrada dentro do vidro, não como fundo opaco da tela.

## Observações desta versão
Esta é uma primeira base funcional, não uma cópia integral do renderizador C++/OpenGL original. O efeito atual é um shader WebGL 2 inspirado em princípios de refração, Fresnel, bordas especulares e distorção. Para a aparência mais física possível, o próximo passo é adicionar mapa de espessura/normal, blur em múltiplas passagens e controles de ambiente/iluminação.

## Compatibilidade
Requer navegador com WebGL 2. A instalação PWA depende de HTTPS (ou localhost). A exportação 4K usa memória gráfica; se o aparelho não suportar, selecione 2K.
