/** * Utilitário de Sanitização para prevenção de XSS * Limpa tags HTML perigosas mantendo formatação básica segura. */
const allowedTags = ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre'];

export const sanitizeHTML = (html: string): string => {
  if (!html) return '';
  // Cria um elemento temporário no DOM (apenas em ambiente browser)
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Função recursiva para limpar nós inseguros
  const cleanNode = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();

      // Remove tags não permitidas, mas mantém seu conteúdo texto
      if (!allowedTags.includes(tagName)) {
        const fragment = document.createDocumentFragment();
        while (element.firstChild) {
          cleanNode(element.firstChild);
          fragment.appendChild(element.firstChild);
        }
        element.replaceWith(fragment);
        return;
      }

      // Remove atributos perigosos (como onclick, onerror, href="javascript:...")
      Array.from(element.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        const value = attr.value;
        if (name.startsWith('on') || value.startsWith('javascript:')) {
          element.removeAttribute(name);
        }
      });
    } else if (node.nodeType === Node.TEXT_NODE) {
      // Nós de texto são seguros por padrão
      return;
    }

    // Processa filhos
    Array.from(node.childNodes).forEach(cleanNode);
  };

  cleanNode(tempDiv);
  return tempDiv.innerHTML;
};
