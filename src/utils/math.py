import numpy as np


def cosine_similarity(emb_query, emb_known):
    """
    Calculate cosine similarity between query embedding and known embeddings.
    
    Args:
        emb_query: Query embedding, shape (1, n) or (n,)
        emb_known: Known embeddings, shape (m, n)
    
    Returns:
        Similarities array of shape (m,)
    """
    if emb_query.ndim == 1:
        emb_query = emb_query.reshape(1, -1)
    if emb_known.ndim == 1:
        emb_known = emb_known.reshape(1, -1)
    
    query_norm = np.linalg.norm(emb_query, axis=1, keepdims=True)
    known_norms = np.linalg.norm(emb_known, axis=1, keepdims=True)
    
    similarities = np.dot(emb_query, emb_known.T) / (query_norm * known_norms.T)
    
    return similarities.flatten()
