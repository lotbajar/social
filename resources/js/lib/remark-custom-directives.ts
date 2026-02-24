import { visit } from 'unist-util-visit';
import { VFile } from 'vfile';
import { Root, Node, Literal } from 'mdast';
import {
  TextDirective,
  LeafDirective,
  ContainerDirective,
} from 'mdast-util-directive';


/** 
 * Mapa de estilos permitidos para la directiva ":style".
 * Cada clave representa el valor aceptado en Markdown
 * y el valor corresponde a la clase CSS (Tailwind).
 */

//Mapa de colores permitidos.
const colors = {
  yellow: 'text-yellow-400',
  blue: 'text-blue-500',
  red: 'text-red-500',
  green: 'text-green-500',
  pink: 'text-pink-400',
};

// Mapa de tamaños de fuente permitidos.
const sizes = {
  xsmall: 'text-xs',
  small: 'text-sm',
  large: 'text-lg',
  xlarge: 'text-xl',
};


/** 
 * Tipos
 */
type ColorKey = keyof typeof colors;
type SizeKey = keyof typeof sizes;
type DirectiveNode = TextDirective | LeafDirective | ContainerDirective;


/** 
 * Guardas de tipo
 */

// Determina si un nodo corresponde a alguna variante de directiva Markdown.
function isDirective(node: Node): node is DirectiveNode {
  return (
    node.type === 'textDirective' ||
    node.type === 'leafDirective' ||
    node.type === 'containerDirective'
  );
}

// Verifica si un nodo contiene un valor literal.
// Se utiliza principalmente para extraer texto plano desde nodos hijos
function isLiteral(node: Node): node is Literal {
  return 'value' in node;
}


/**
 * Plugin remark que transforma directivas Markdown personalizadas en nodos HTML.
 */
export default function remarkCustomDirectives() {
  return (tree: Root, file: VFile) => {

    // Recorre todos los nodos del árbol Markdown.
    visit(tree, (node: Node) => {
      if (isDirective(node)) {        
        
        /**
         * Manejo de la directiva ":style".
         * Se aplica únicamente a directivas de texto en línea.
         * Permite definir color y tamaño mediante atributos.
         */
        if (node.name === 'style' && node.type === 'textDirective') {
          const styleNode = node as TextDirective;

          // Obtiene los atributos definidos en la directiva (si existen).
          const attrs = styleNode.attributes || {};

          const colorAttr = attrs.color as ColorKey | undefined;
          const sizeAttr = attrs.size as SizeKey | undefined;

          // Valida que el color exista dentro del mapa permitido.
          const colorClass = colorAttr && colorAttr in colors ? colors[colorAttr] : '';

          // Valida que el tamaño exista dentro del mapa permitido.
          const sizeClass = sizeAttr && sizeAttr in sizes ? sizes[sizeAttr] : '';

          // Define la información necesaria para que remark-rehype
          // genere un elemento <span> con las clases correspondientes.
          node.data = {
            hName: 'span',
            hProperties: {
              className: [colorClass, sizeClass].join(' '),
            },
          };
        }

        /**
         * Manejo de la directiva ":hidden".
         * Puede utilizarse tanto en texto en línea como en bloques.
         */
        if (node.name === 'hidden' && (node.type === 'textDirective' || node.type === 'containerDirective')) {
          const hiddenNode = node as TextDirective | ContainerDirective;

          // Se define un nodo HTML personalizado (<hidden>)
          // junto con un atributo que indica si su comportamiento
          // es inline o block, según el tipo de directiva.
          hiddenNode.data = {
            hName: 'hidden',
            hProperties: {
              type:
                hiddenNode.type === 'textDirective'
                  ? 'inline'
                  : 'block',
            },
          };
        }

        /**
         * Manejo de la directiva ":video".
         * Solo se procesa cuando es una directiva de tipo hoja.
         */
        if (node.type === 'leafDirective' && node.name === 'video') {
          const videoNode = node as LeafDirective;
          
          let url = '';

          // Se obtiene el primer hijo, que se espera contenga la URL.
          const firstChild =videoNode.children?.[0];
          
          // Si el hijo existe y es un nodo literal,
          // se extrae el valor como URL del video.
          if (firstChild && isLiteral(firstChild)) {
              url = firstChild.value;
          }

          // Se detecta el servicio de video a partir de la URL.
          const service = detectVideoService(url);

          // Se construyen las propiedades del nodo según el servicio.
          switch(service) {
            case 'youtube':
              videoNode.data = {
                hName: 'iframe',
                hProperties: buildVideoIframeProps('youtube', url),
              };
              break;

            case 'html5':
              videoNode.data = {
                hName: 'video',
                hProperties: {
                  src: url,
                  controls: true,
                  className: 'w-full max-w-3xl mx-auto rounded-lg',
                },
              };
              break;
              
            default:
              videoNode.data = {
                hName: 'span',
              };
          }

          // Se eliminan los hijos originales,
          // ya que el iframe no debe renderizar contenido interno.
          videoNode.children = [];
        }
      }
    });
  };
}

/**
 * Detecta el servicio de video según la URL proporcionada.
 */
function detectVideoService(url: string): 'youtube' | 'html5' | null {
  // YouTube
  if (/youtu(\.be|be\.com)/i.test(url)) {
    return 'youtube';
  }

  // Video HTML5 (mp4, webm, ogg)
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) {
    return 'html5';
  }

  return null;
}

/**
 * Genera las propiedades del iframe necesarias
 * para renderizar correctamente el video embebido.
 */
function buildVideoIframeProps(service: 'youtube', url: string) {
  switch (service) {
    case 'youtube': {
      const videoId = extractYouTubeId(url);

      // Si no se puede extraer el ID, se retorna un objeto vacío.
      if (!videoId)  {
        return {};
      }

      return {
        src: `https://www.youtube.com/embed/${videoId}`,
        width: 560,
        height: 315,
        frameBorder: 0,
        allow:
          'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
        allowFullScreen: true,
        'data-service': 'youtube',
      };
    }
  }
}

/**
 * Extrae el ID de un video de YouTube desde una URL válida.
 * Soporta formatos cortos y largos.
 */
function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}