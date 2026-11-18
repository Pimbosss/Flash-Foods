'use client';

import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useCarrinho } from "@/context/CarrinhoContext";

export interface RestauranteBanco {
    id: string;
    nome: string;
    categoria: string;
    cnpj?: string;
    produtos: any[];
}

export default function usePedirAgora() {
    const { adicionarAoCarrinho } = useCarrinho();

    const [categoria, setCategoria] = useState("Todos");
    const [busca, setBusca] = useState("");
    const [enderecoEntrega, setEnderecoEntrega] = useState("");
    const [restaurantes, setRestaurantes] = useState<RestauranteBanco[]>([]);
    const [restauranteSelecionado, setRestauranteSelecionado] = useState<RestauranteBanco | null>(null);

    // 📥 Carrega o endereço salvo do usuário e os restaurantes do Firestore
    useEffect(() => {
        if (typeof window !== "undefined") {
            const sessao = localStorage.getItem("flashfoods:user");
            if (sessao) {
                const usuarioLogado = JSON.parse(sessao);
                if (usuarioLogado.endereco) {
                    setEnderecoEntrega(usuarioLogado.endereco);
                }
            }
        }

        async function carregarRestaurantes() {
            try {
                const querySnapshot = await getDocs(collection(db, "restaurantes"));
                const listaLojas: RestauranteBanco[] = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as RestauranteBanco));

                setRestaurantes(listaLojas);
            } catch (err) {
                console.error("Erro ao carregar restaurantes do Firestore:", err);
            }
        }

        carregarRestaurantes();
    }, []);

    // 📍 Atualiza o endereço na sessão e no Firestore quando o cliente clica em "Adicionar"
    const salvarEnderecoEntrega = async () => {
        if (!enderecoEntrega.trim()) {
            alert("Digite um endereço válido para entrega! 📍");
            return;
        }

        const sessao = localStorage.getItem("flashfoods:user");
        if (!sessao) {
            alert("Endereço definido para esta visita! (Faça login para salvar na sua conta) 📍");
            return;
        }

        try {
            const usuarioLogado = JSON.parse(sessao);
            
            // Atualiza no Firestore
            const userRef = doc(db, "users", usuarioLogado.id);
            await updateDoc(userRef, {
                endereco: enderecoEntrega.trim()
            });

            // Atualiza na sessão ativa para o Carrinho ler imediatamente
            const novaSessao = {
                ...usuarioLogado,
                endereco: enderecoEntrega.trim()
            };
            localStorage.setItem("flashfoods:user", JSON.stringify(novaSessao));

            alert("Endereço de entrega atualizado com sucesso! 🛵📍");
        } catch (error) {
            console.error("Erro ao atualizar endereço:", error);
            alert("Erro ao salvar o novo endereço no servidor.");
        }
    };

    // 🟢 1. FILTRO DE RESTAURANTES COM SUPORTE A SINÔNIMOS
    const restaurantesFiltrados = restaurantes.filter((restaurante) => {
        const correspondeBusca = restaurante.nome.toLowerCase().includes(busca.toLowerCase());
        if (!correspondeBusca) return false;

        if (categoria === "Todos") return true;

        const catLojaLimpa = restaurante.categoria 
            ? restaurante.categoria.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() 
            : "";
        
        const catBotaoLimpa = categoria.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

        if (catLojaLimpa && (catLojaLimpa.includes(catBotaoLimpa) || catBotaoLimpa.includes(catLojaLimpa))) {
            return true;
        }

        if (catBotaoLimpa.includes("hamb") && (catLojaLimpa.includes("lanche") || restaurante.nome.toLowerCase().includes("hamburguer"))) {
            return true;
        }

        const listaPratosInternos = restaurante.produtos || [];
        const vendeItemDaCategoria = listaPratosInternos.some((prato: any) => {
            if (prato.ativo === false) return false;
            
            const tipoPratoLimpo = prato.tipo ? prato.tipo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() : "";
            
            if (tipoPratoLimpo.includes("hamb") && (tipoPratoLimpo.includes("lanche") || tipoPratoLimpo.includes("hamb"))) {
                return true;
            }
            if (tipoPratoLimpo.includes("beb") && (tipoPratoLimpo.includes("beb") || tipoPratoLimpo.includes("refri") || tipoPratoLimpo.includes("suco"))) {
                return true;
            }

            return tipoPratoLimpo.includes(catBotaoLimpa) || catBotaoLimpa.includes(tipoPratoLimpo);
        });

        return vendeItemDaCategoria;
    });

    // 🍕 2. FILTRO DE PRATOS UNIVERSAL
    const pratosDoCardapio = (() => {
        let listaBrutaPratos: any[] = [];

        if (restauranteSelecionado) {
            listaBrutaPratos = (restauranteSelecionado.produtos || []).map(p => ({
                ...p,
                restauranteId: restauranteSelecionado.id,
                nomeRestaurante: restauranteSelecionado.nome
            }));
        } else {
            restaurantesFiltrados.forEach((loja) => {
                const pratosDaLoja = (loja.produtos || []).map(p => ({
                    ...p,
                    restauranteId: loja.id,
                    nomeRestaurante: loja.nome
                }));
                listaBrutaPratos.push(...pratosDaLoja);
            });
        }

        return listaBrutaPratos.filter((prato: any) => {
            if (prato.ativo === false) return false; 
            
            if (categoria !== "Todos") {
                const tipoPratoLimpo = prato.tipo ? prato.tipo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() : "";
                const filtroBotaoLimpo = categoria.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

                let bateuFiltro = tipoPratoLimpo.includes(filtroBotaoLimpo) || filtroBotaoLimpo.includes(tipoPratoLimpo);

                if (filtroBotaoLimpo.includes("hamb") && (tipoPratoLimpo.includes("lanche") || tipoPratoLimpo.includes("hamb"))) {
                    bateuFiltro = true;
                }
                if (filtroBotaoLimpo.includes("beb") && (tipoPratoLimpo.includes("beb") || tipoPratoLimpo.includes("refri") || tipoPratoLimpo.includes("suco"))) {
                    bateuFiltro = true;
                }

                if (!bateuFiltro) return false;
            }

            return prato.nome.toLowerCase().includes(busca.toLowerCase());
        });
    })();

    return {
        categoria,
        setCategoria,
        busca,
        setBusca,
        enderecoEntrega,
        setEnderecoEntrega,
        salvarEnderecoEntrega,
        restauranteSelecionado,
        setRestauranteSelecionado,
        restaurantesFiltrados,
        pratosDoCardapio,
        adicionarAoCarrinho
    };
}
