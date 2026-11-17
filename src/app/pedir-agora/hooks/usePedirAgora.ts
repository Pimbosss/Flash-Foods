'use client';

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
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
    const [restaurantes, setRestaurantes] = useState<RestauranteBanco[]>([]);
    const [restauranteSelecionado, setRestauranteSelecionado] = useState<RestauranteBanco | null>(null);

    // 📥 Carrega os estabelecimentos da coleção "restaurantes" do Firestore
    useEffect(() => {
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
        restauranteSelecionado,
        setRestauranteSelecionado,
        restaurantesFiltrados,
        pratosDoCardapio,
        adicionarAoCarrinho
    };
}
