'use client';

import { useState, useEffect } from "react";
import { GoPencil } from "react-icons/go";
import { FaRegTrashAlt } from "react-icons/fa";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/services/firebase";
import styles from "../restaurante.module.css";

interface ProdutosProps {
    dadosLoja: any;
}

export default function Produtos({ dadosLoja }: ProdutosProps) {
    const [produtos, setProdutos] = useState<any[]>([]);
    const [modalAberto, setModalAberto] = useState(false);
    const [produtoEditando, setProdutoEditando] = useState<any>(null);

    const [produto, setProduto] = useState({
        tipo: "",
        nome: "",
        descricao: "",
        preco: ""
    });

    const categorias = ["Lanches", "Pizza", "Bebidas", "Sobremesas", "Salgados"];

    // 📥 1. CARREGA OS PRODUTOS REAIS DIRETO DO FIRESTORE DA LOJA LOGADA
    useEffect(() => {
        async function carregarProdutos() {
            if (dadosLoja && dadosLoja.id) {
                try {
                    const lojaRef = doc(db, "restaurantes", dadosLoja.id);
                    const lojaSnap = await getDoc(lojaRef);

                    if (lojaSnap.exists()) {
                        setProdutos(lojaSnap.data().produtos || []);
                    } else {
                        setProdutos([]);
                    }
                } catch (err) {
                    console.error("Erro ao buscar produtos do cardápio no Firestore:", err);
                    setProdutos([]);
                }
            }
        }

        carregarProdutos();
    }, [dadosLoja]);

    // 🔄 2. SINCRONIZA A LISTA DE PRODUTOS COM O FIRESTORE
    const sincronizarComServidor = async (novosProdutos: any[]) => {
        try {
            setProdutos(novosProdutos);

            const idFisicoReal = dadosLoja?.id;

            if (!idFisicoReal) {
                console.warn("Aguardando carregamento da ID comercial do restaurante...");
                return;
            }

            const lojaRef = doc(db, "restaurantes", idFisicoReal);
            await updateDoc(lojaRef, {
                produtos: novosProdutos
            });
            
        } catch (error) {
            console.error("Erro crítico na sincronização com o Firestore:", error);
            alert("Erro de comunicação com o banco na nuvem ao tentar salvar o prato.");
        }
    };

    const abrirModal = () => {
        setProdutoEditando(null);
        setProduto({ tipo: "", nome: "", descricao: "", preco: "" });
        setModalAberto(true);
    };

    const fecharModal = () => {
        setModalAberto(false);
        setProdutoEditando(null);
        setProduto({ tipo: "", nome: "", descricao: "", preco: "" });
    };

    const editarProduto = (item: any) => {
        setProdutoEditando(item.id);
        setProduto({
            tipo: item.tipo,
            nome: item.nome,
            descricao: item.descricao,
            preco: item.preco
        });
        setModalAberto(true);
    };

    const alterarCampo = (campo: string, valor: string) => {
        setProduto({ ...produto, [campo]: valor });
    };

    const salvarProduto = (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (produtoEditando) {
            const novosProdutos = produtos.map((item) => {
                if (item.id === produtoEditando) {
                    return {
                        ...item,
                        tipo: produto.tipo,
                        nome: produto.nome,
                        descricao: produto.descricao,
                        preco: produto.preco
                    };
                }
                return item;
            });
            sincronizarComServidor(novosProdutos);
        } else {
            const novoProduto = {
                id: String(Date.now()),
                tipo: produto.tipo,
                nome: produto.nome,
                descricao: produto.descricao,
                preco: produto.preco,
                vendidos: 0,
                ativo: true
            };
            sincronizarComServidor([...produtos, novoProduto]);
        }
        fecharModal();
    };

    const alterarStatus = (id: string) => {
        const novosProdutos = produtos.map((item) => {
            if (item.id === id) {
                return { ...item, ativo: !item.ativo };
            }
            return item;
        });
        sincronizarComServidor(novosProdutos);
    };

    const excluirProduto = (id: string) => {
        const confirmar = window.confirm("Tem certeza que deseja excluir este produto?");
        if (!confirmar) return;

        const novosProdutos = produtos.filter((item) => item.id !== id);
        sincronizarComServidor(novosProdutos);
    };

    return (
        <div className={styles.homeProdutos}>
            <div className={styles.cabecalhoProdutos}>
                <h1>
                    <span className={styles.nprodutos}>{produtos.length}</span> Produtos cadastrados
                </h1>
                <button className={styles.btnAdicionarProduto} onClick={abrirModal}>
                    + Adicionar Produtos
                </button>
            </div>

            {categorias.map((categoria) => {
                const produtosCategoria = produtos.filter((item) => item.tipo === categoria);
                if (produtosCategoria.length === 0) return null;

                return (
                    <div className={styles.categoriaProdutos} key={categoria}>
                        <h1>{categoria}</h1>

                        {produtosCategoria.map((item) => (
                            <div className={`${styles.cardProduto} ${!item.ativo ? styles.produtoDesativado : ""}`} key={item.id}>
                                <h1>{item.nome}</h1>
                                <p>R$ {item.preco}</p>
                                <p>{item.descricao}</p>
                                <p>{item.vendidos} vendidos</p>

                                <label className={styles.switch}>
                                    <input type="checkbox" checked={item.ativo} onChange={() => alterarStatus(item.id)} />
                                    <span className={styles.slider}></span>
                                </label>

                                <button className={styles.btnEditar} onClick={() => editarProduto(item)}>
                                    <GoPencil />
                                </button>
                                <button className={styles.btnExcluir} onClick={() => excluirProduto(item.id)}>
                                    <FaRegTrashAlt />
                                </button>
                            </div>
                        ))}
                    </div>
                );
            })}

            {/* MODAL DE PRODUTOS */}
            {modalAberto && (
                <div className={styles.modalOverlay} onClick={fecharModal}>
                    <div className={styles.modalProduto} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>{produtoEditando ? "Editar Produto" : "Adicionar Produto"}</h2>
                            <button className={styles.btnFechar} type="button" onClick={fecharModal}>×</button>
                        </div>

                        <form onSubmit={salvarProduto}>
                            <div className={styles.campoProduto}>
                                <label>Tipo</label>
                                <select value={produto.tipo} onChange={(e) => alterarCampo("tipo", e.target.value)} required>
                                    <option value="">Selecione o tipo</option>
                                    {categorias.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.campoProduto}>
                                <label>Nome</label>
                                <input type="text" value={produto.nome} onChange={(e) => alterarCampo("nome", e.target.value)} placeholder="Nome do produto" required />
                            </div>

                            <div className={styles.campoProduto}>
                                <label>Descrição</label>
                                <input type="text" value={produto.descricao} onChange={(e) => alterarCampo("descricao", e.target.value)} placeholder="Descrição do produto" required />
                            </div>

                            <div className={styles.campoProduto}>
                                <label>Preço</label>
                                <input type="text" value={produto.preco} onChange={(e) => alterarCampo("preco", e.target.value)} placeholder="00,00" required />
                            </div>

                            <div className={styles.modalBotoes}>
                                <button type="button" className={styles.btnCancelar} onClick={fecharModal}>Cancelar</button>
                                <button type="submit" className={styles.btnAdicionar}>
                                    {produtoEditando ? "Salvar Alterações" : "Adicionar Produto"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
