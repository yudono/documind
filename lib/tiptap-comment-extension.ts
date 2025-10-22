import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Command, RawCommands } from '@tiptap/core';

export interface Comment {
  id: string;
  content: string;
  author: string;
  authorId: string;
  createdAt: Date;
  resolved: boolean;
  position: {
    from: number;
    to: number;
  };
  replies?: Comment[];
}

export interface CommentOptions {
  onCommentCreate?: (comment: Omit<Comment, 'id' | 'createdAt'>) => void;
  onCommentUpdate?: (commentId: string, content: string) => void;
  onCommentResolve?: (commentId: string) => void;
  onCommentDelete?: (commentId: string) => void;
  comments?: Comment[];
}

export const CommentExtension = Extension.create<CommentOptions>({
  name: 'comments',

  addOptions() {
    return {
      onCommentCreate: () => {},
      onCommentUpdate: () => {},
      onCommentResolve: () => {},
      onCommentDelete: () => {},
      comments: [],
    };
  },

  addStorage() {
    return {
      comments: this.options.comments || [],
      activeCommentId: null,
      selectedRange: null,
    };
  },

  addCommands() {
    return {
      addComment:
        (content: string, author: string, authorId: string) =>
        ({ state, dispatch }: any) => {
          const { from, to } = state.selection;
          
          if (from === to) {
            return false;
          }

          const comment: Omit<Comment, 'id' | 'createdAt'> = {
            content,
            author,
            authorId,
            resolved: false,
            position: { from, to },
            replies: [],
          };

          this.options.onCommentCreate?.(comment);
          return true;
        },

      resolveComment:
        (commentId: string) =>
        ({ dispatch }: any) => {
          this.options.onCommentResolve?.(commentId);
          return true;
        },

      deleteComment:
        (commentId: string) =>
        ({ dispatch }: any) => {
          this.options.onCommentDelete?.(commentId);
          return true;
        },

      setActiveComment:
        (commentId: string | null) =>
        ({ dispatch }: any) => {
          this.storage.activeCommentId = commentId;
          return true;
        },
    } as any;
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('comments'),
        state: {
          init: () => {
            return DecorationSet.empty;
          },
          apply: (tr, decorationSet) => {
            // Map decorations through document changes
            decorationSet = decorationSet.map(tr.mapping, tr.doc);

            // Create decorations for comments
            const decorations: Decoration[] = [];
            
            this.storage.comments.forEach((comment: Comment) => {
              if (!comment.resolved) {
                const decoration = Decoration.inline(
                  comment.position.from,
                  comment.position.to,
                  {
                    class: `comment-highlight ${
                      this.storage.activeCommentId === comment.id ? 'active' : ''
                    }`,
                    'data-comment-id': comment.id,
                  }
                );
                decorations.push(decoration);
              }
            });

            return DecorationSet.create(tr.doc, decorations);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
          handleClick: (view, pos, event) => {
            const target = event.target as HTMLElement;
            const commentId = target.getAttribute('data-comment-id');
            
            if (commentId) {
              this.storage.activeCommentId = commentId;
              // Trigger a re-render by dispatching a transaction
              view.dispatch(view.state.tr);
              return true;
            }
            
            return false;
          },
        },
      }),
    ];
  },

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          commentId: {
            default: null,
            parseHTML: element => element.getAttribute('data-comment-id'),
            renderHTML: attributes => {
              if (!attributes.commentId) {
                return {};
              }
              return {
                'data-comment-id': attributes.commentId,
              };
            },
          },
        },
      },
    ];
  },
});

export default CommentExtension;