pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol"; 
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "Interfaces/IBancorNetwork.sol";
import "hardhat/console.sol";

    /**
    * @title NFTToken 
    * @author Dusan Stankovic
    * @notice Contract allows the creation of NFTGift tokens
    */
    
contract NFTToken is ERC721{

    using SafeERC20 for IERC20;

    IContractRegistry contractRegistry;
    bytes32 constant bancorNetworkName = "BancorNetwork";
    address constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    function getBancorNetworkContract() public returns(IBancorNetwork) {
        return IBancorNetwork(contractRegistry.addressOf(bancorNetworkName));
    }

    /**
    * @notice Constructor defines the name and symbol of the token
    *
    * @dev Constructor receives the address of network
    * @param _contractRegistryAddress represents the network address
    */

    constructor(address _contractRegistryAddress) ERC721("NFTGift", "NTG") {
        contractRegistry = IContractRegistry(_contractRegistryAddress);
    } 

    uint256 internal tokenId;

    struct Positon {
        address tokenAddr;
        uint256 amount;
    }

    mapping(uint256 => Positon) positon;

    /**
    * @notice The function creates an NFT token
    *
    * @param _tokenAddr represents address of ERC20 token to deposit
    * @param _amount represents amount of ERC20 token to deposit
    *
    * Function is payable and can receive ETH for creating NFT token
    */

    function createNft(address _tokenAddr, uint256 _amount) payable external {
        if (msg.value == 0) {
            IERC20(_tokenAddr).safeTransferFrom(msg.sender, address(this), _amount);
        } else {
            _tokenAddr = ETH_ADDRESS;
            _amount = msg.value;
        }
        
        positon[tokenId].tokenAddr = _tokenAddr;
        positon[tokenId].amount = _amount;

        _mint(msg.sender, tokenId++);
     }
    
    /**
    * @notice The function is used for burning and withdrawing
    *
    * @param _tokenId The unique ID for the token that was created
    * @param _tokenAddr represents address of desire token to withdraw
    * @param _expectedAmount represents amount that user expects to withdraw
    */

    function liquidateNft(uint256 _tokenId, address _tokenAddr, uint256 _expectedAmount) external {
        IBancorNetwork bancorNetwork = IBancorNetwork(contractRegistry.addressOf(bancorNetworkName));

        address positionAddress = positon[_tokenId].tokenAddr;
        uint256 positionAmount = positon[_tokenId].amount;

        address[] memory path = bancorNetwork.conversionPath(positionAddress, _tokenAddr); 
        uint256 minReturn = bancorNetwork.rateByPath(path, positionAmount);

        console.log(minReturn);

        require(minReturn >= _expectedAmount, "Expected amount to high");

        if (positionAddress != ETH_ADDRESS) IERC20(positionAddress).safeApprove(address(bancorNetwork), positionAmount);

        bancorNetwork.convertByPath{value: (positionAddress == ETH_ADDRESS) ? positionAmount : 0}(path, positionAmount, minReturn, address(0), address(0), 0);

        _burn(_tokenId);
    }

    /**
    * @notice This function is used for getting address 
    *
    * @param _tokenId Unique Id for each NFT token
    */

    function getTokenAddress(uint256 _tokenId) external view returns(address) {
        require(_exists(_tokenId), "Token doesn't exist");
        return positon[_tokenId].tokenAddr;
    }

    /**
    * @notice This function is used for getting amount 
    *
    * @param _tokenId Unique Id for each NFT token
    */

    function getTokenAmount(uint256 _tokenId) external view returns(uint256) {
        require(_exists(_tokenId), "Token doesn't exist");
        return positon[_tokenId].amount;
    } 

    /**
    * @notice This function checks if the NFT exists
    *
    * @param _tokenId Unique Id for each NFT token
    */

    function exists(uint256 _tokenId) external view returns(bool) {
        return _exists(_tokenId);
    }

}